import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import exceptions as argon_exceptions
from flask import Blueprint, current_app, g, jsonify, request, session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..constants import EMAIL_PATTERN, EXPENSE_CATEGORIES, INCOME_CATEGORIES
from ..email_service import EmailDeliveryError, send_verification_code
from ..extensions import db, limiter, passwords
from ..helpers import authenticate_request, authenticated_session, ensure_utc, serialize_user
from ..models import Category, EmailVerificationChallenge, LoginSession, User

bp = Blueprint("auth", __name__)
VERIFICATION_CODE_TTL_MINUTES = 10
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
VERIFICATION_MAX_ATTEMPTS = 5


def verification_code_digest(user: User, code: str) -> str:
    secret = str(current_app.config["SECRET_KEY"]).encode()
    payload = f"{user.id}:{user.email}:{code}".encode()
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()


def issue_verification_code(user: User) -> bool:
    now = datetime.now(timezone.utc)
    challenge = db.session.get(EmailVerificationChallenge, user.id)
    if challenge and now - ensure_utc(challenge.sent_at) < timedelta(seconds=VERIFICATION_RESEND_COOLDOWN_SECONDS):
        return False

    code = f"{secrets.randbelow(100_000_000):08d}"
    if challenge is None:
        challenge = EmailVerificationChallenge(user_id=user.id)
        db.session.add(challenge)
    challenge.code_digest = verification_code_digest(user, code)
    challenge.attempts = 0
    challenge.sent_at = now
    challenge.expires_at = now + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES)
    db.session.commit()
    try:
        send_verification_code(user.email, code, VERIFICATION_CODE_TTL_MINUTES)
    except EmailDeliveryError:
        db.session.delete(challenge)
        db.session.commit()
        raise
    return True


@bp.post("/api/auth/register")
@limiter.exempt
def register():
    data = request.get_json(silent=True) or {}
    first_name = str(data.get("first_name", "")).strip()
    middle_name = str(data.get("middle_name", "")).strip()
    last_name = str(data.get("last_name", "")).strip()
    email = str(data.get("email", "")).strip().casefold()
    password = str(data.get("password", ""))
    if (not first_name or not last_name or len(first_name) > 100 or len(middle_name) > 100
            or len(last_name) > 100 or len(email) > 254 or not EMAIL_PATTERN.fullmatch(email)):
        return jsonify(error="Please check the details and try again."), 400
    if len(password) < 12 or len(password) > 128:
        return jsonify(error="Use a password between 12 and 128 characters."), 400
    user = User(first_name=first_name, middle_name=middle_name or None, last_name=last_name,
                email=email, password_hash=passwords.hash(password))
    try:
        db.session.add(user)
        db.session.flush()
        for kind, entries in (("expense", EXPENSE_CATEGORIES), ("income", INCOME_CATEGORIES)):
            for category_name, color in entries:
                db.session.add(Category(user_id=user.id, name=category_name, type=kind, color=color))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="Unable to create the account with those details."), 409
    try:
        issue_verification_code(user)
    except EmailDeliveryError:
        return jsonify(error="Your account was created, but the verification email could not be sent. Check the development email sandbox settings, then sign in to request a new code."), 503
    return jsonify(verification_required=True, email=user.email, message="We sent an 8-digit verification code to your email. It expires in 10 minutes."), 201


@bp.post("/api/auth/login")
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().casefold()
    user = db.session.scalar(select(User).where(User.email == email))
    now = datetime.now(timezone.utc)
    if user and user.signin_delay_until and ensure_utc(user.signin_delay_until) > now:
        return jsonify(error="Unable to sign in. Check your details or try again later."), 401
    try:
        valid = bool(user and passwords.verify(user.password_hash, str(data.get("password", ""))))
    except (argon_exceptions.VerificationError, argon_exceptions.InvalidHashError):
        valid = False
    if not valid:
        if user:
            window = ensure_utc(user.failed_signin_window) if user.failed_signin_window else None
            if not window or now - window > timedelta(minutes=10):
                user.failed_signins = 0
                user.failed_signin_window = now
            user.failed_signins += 1
            if user.failed_signins >= 5:
                user.signin_delay_until = now + timedelta(minutes=15)
                user.failed_signins = 0
            db.session.commit()
        return jsonify(error="Unable to sign in. Check your details or try again later."), 401
    if not user.email_verified_at:
        try:
            issue_verification_code(user)
        except EmailDeliveryError:
            return jsonify(error="Email verification delivery is unavailable. Check the development email sandbox settings and try again."), 503
        return jsonify(verification_required=True, email=user.email, message="Your email is not verified yet. Enter the code we sent, or request another code shortly.")
    user.failed_signins = 0
    user.failed_signin_window = None
    user.signin_delay_until = None
    raw_token = secrets.token_urlsafe(32)
    remember_me = data.get("remember_me") is True
    db.session.add(LoginSession(user_id=user.id, token_hash=hashlib.sha256(raw_token.encode()).hexdigest(), expires_at=now + timedelta(days=30 if remember_me else 7)))
    db.session.commit()
    session.clear()
    session["auth_token"] = raw_token
    session.permanent = remember_me
    return jsonify(user=serialize_user(user))


@bp.post("/api/auth/verify-email")
@limiter.limit("10 per minute")
def verify_email():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().casefold()
    code = str(data.get("code", "")).strip()
    user = db.session.scalar(select(User).where(User.email == email))
    challenge = db.session.get(EmailVerificationChallenge, user.id) if user else None
    now = datetime.now(timezone.utc)
    invalid = jsonify(error="That code is invalid or expired. Request a new one and try again.")
    if not user or user.email_verified_at or not challenge or not re.fullmatch(r"\d{8}", code):
        return invalid, 400
    if ensure_utc(challenge.expires_at) <= now:
        return invalid, 400
    if challenge.attempts >= VERIFICATION_MAX_ATTEMPTS:
        return jsonify(error="Too many incorrect codes. Request a new code before trying again."), 429
    if not hmac.compare_digest(challenge.code_digest, verification_code_digest(user, code)):
        challenge.attempts += 1
        db.session.commit()
        if challenge.attempts >= VERIFICATION_MAX_ATTEMPTS:
            return jsonify(error="Too many incorrect codes. Request a new code before trying again."), 429
        return invalid, 400
    user.email_verified_at = now
    db.session.delete(challenge)
    db.session.commit()
    return jsonify(message="Email verified. You can now sign in.")


@bp.post("/api/auth/resend-verification")
@limiter.limit("5 per hour")
@limiter.limit("1 per minute")
def resend_verification():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().casefold()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        return jsonify(error="Enter a valid email address."), 400
    user = db.session.scalar(select(User).where(User.email == email))
    if user and not user.email_verified_at:
        try:
            issue_verification_code(user)
        except EmailDeliveryError:
            return jsonify(error="Email delivery is unavailable. Check the development email sandbox settings and try again."), 503
    return jsonify(message="If this account needs verification, a code will be sent to its email address.")


@bp.post("/api/auth/logout")
def logout():
    current = authenticated_session()
    if current:
        current.revoked_at = datetime.now(timezone.utc)
        db.session.commit()
    session.clear()
    return jsonify(message="Signed out.")


@bp.get("/api/auth/me")
def me():
    user = getattr(g, "current_user", None) or authenticate_request()
    if not user:
        return jsonify(error="Authentication required."), 401
    return jsonify(user=serialize_user(user))
