from datetime import datetime, timezone
from io import BytesIO
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, g, jsonify, request, send_file

from ..extensions import db
from ..helpers import require_user, serialize_user

bp = Blueprint("profile", __name__)


@bp.patch("/api/profile")
@require_user
def update_profile():
    data = request.get_json(silent=True) or {}
    changed = False
    name_fields = ("first_name", "middle_name", "last_name")
    if any(field in data for field in name_fields):
        first_name = str(data.get("first_name", g.current_user.first_name)).strip()
        middle_name = str(data.get("middle_name", g.current_user.middle_name or "")).strip()
        last_name = str(data.get("last_name", g.current_user.last_name)).strip()
        if (not first_name or not last_name or len(first_name) > 100
                or len(middle_name) > 100 or len(last_name) > 100):
            return jsonify(error="First and last name are required and each name must be 100 characters or fewer."), 400
        g.current_user.first_name = first_name
        g.current_user.middle_name = middle_name or None
        g.current_user.last_name = last_name
        changed = True
    if "time_zone" in data:
        time_zone = str(data["time_zone"]).strip()
        try:
            ZoneInfo(time_zone)
        except (ZoneInfoNotFoundError, ValueError):
            return jsonify(error="Choose a valid time zone."), 400
        g.current_user.time_zone = time_zone
        changed = True
    if not changed:
        return jsonify(error="Provide a name or time zone to update."), 400
    db.session.commit()
    user = g.current_user
    return jsonify(user=serialize_user(user))


@bp.get("/api/profile/avatar")
@require_user
def get_profile_avatar():
    user = g.current_user
    if not user.profile_image_data or not user.profile_image_mime:
        return jsonify(error="No profile image has been uploaded."), 404
    response = send_file(
        BytesIO(user.profile_image_data),
        mimetype=user.profile_image_mime,
        max_age=0,
        conditional=False,
    )
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@bp.put("/api/profile/avatar")
@require_user
def upload_profile_avatar():
    image = request.files.get("image")
    if not image:
        return jsonify(error="Choose an image to upload."), 400
    image_data = image.stream.read(1024 * 1024 + 1)
    if not image_data:
        return jsonify(error="The selected image is empty."), 400
    if len(image_data) > 1024 * 1024:
        return jsonify(error="Choose an image smaller than 1 MB."), 413

    if image_data.startswith(b"\x89PNG\r\n\x1a\n"):
        mime_type = "image/png"
    elif image_data.startswith(b"\xff\xd8\xff"):
        mime_type = "image/jpeg"
    elif image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP":
        mime_type = "image/webp"
    else:
        return jsonify(error="Use a PNG, JPG, or WebP image."), 400

    user = g.current_user
    user.profile_image_data = image_data
    user.profile_image_mime = mime_type
    user.profile_image_updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(user=serialize_user(user))


@bp.delete("/api/profile/avatar")
@require_user
def delete_profile_avatar():
    user = g.current_user
    user.profile_image_data = None
    user.profile_image_mime = None
    user.profile_image_updated_at = None
    db.session.commit()
    return jsonify(user=serialize_user(user))
