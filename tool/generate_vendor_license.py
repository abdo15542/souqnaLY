#!/usr/bin/env python3
import argparse
import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta

PREFIX = "SOULIC2."
LICENSE_TYPE = "souqna.vendor_license.v1"

# يجب أن يطابق تمامًا المفتاح في:
# lib/services/vendor_license_service.dart
SECRET = "souqnaLY_publisher_local_secret_2026_v1_change_me_before_production"

DEFAULT_FEATURES = [
    "sale",
    "returns",
    "print",
    "barcode",
    "shifts",
    "debts",
    "expenses",
    "payroll",
    "reports",
    "profits",
    "costs",
    "inventoryView",
    "inventoryEdit",
    "purchase",
    "suppliers",
    "batches",
    "insights",
    "alerts",
    "salesHistory",
    "cashiers",
    "audit",
    "settings",
    "devices",
    "backup",
]


def hmac_hex(key: str, msg: str) -> str:
    return hmac.new(
        key.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def shop_secret(shop_id: str) -> str:
    return hmac_hex(SECRET, f"publisher:{shop_id}")


def as_bool_str(v) -> str:
    if isinstance(v, bool):
        return "1" if v else "0"
    if v is None:
        return ""
    s = str(v).lower()
    return "1" if s in ("1", "true", "yes") else "0"


def as_str(v) -> str:
    if v is None:
        return ""
    return str(v)


def canonical(payload: dict) -> str:
    features = payload.get("features") or []
    features_str = ",".join(str(x) for x in features)

    parts = [
        as_str(payload.get("type")),
        as_str(payload.get("shopId")),
        as_str(payload.get("shopName")),
        as_str(payload.get("ownerName")),
        as_str(payload.get("plan")),
        features_str,
        as_str(payload.get("maxDevices")),
        as_str(payload.get("issuedAt")),
        as_str(payload.get("expiresAt")),
        as_str(payload.get("graceDays")),
        as_bool_str(payload.get("allowExport")),
        as_bool_str(payload.get("allowBackup")),
        as_bool_str(payload.get("allowBranches")),
        as_str(payload.get("status")),
        as_str(payload.get("nonce")),
    ]

    return "|".join(parts)


def sign(shop_id: str, payload: dict) -> str:
    return hmac_hex(shop_secret(shop_id), canonical(payload))


def rand_token(length: int) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def b64url_no_pad(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def parse_args():
    p = argparse.ArgumentParser(
        description="Generate a Souqna vendor license code for offline testing."
    )

    p.add_argument("--shop-id", default="SHOP-TEST-0001")
    p.add_argument("--shop-name", default="بقالة التجربة")
    p.add_argument("--owner-name", default="المالك")
    p.add_argument("--plan", default="trial")

    p.add_argument("--days", type=int, default=30,
                   help="عدد أيام الصلاحية. استخدم رقمًا سالبًا لاختبار ترخيص منتهي.")
    p.add_argument("--max-devices", type=int, default=3)
    p.add_argument("--grace-days", type=int, default=7)

    p.add_argument("--features", default="",
                   help="قائمة ميزات مفصولة بفواصل. إذا تُركت فارغة سيتم تفعيل كل الميزات.")

    p.add_argument("--no-export", action="store_true", help="منع التصدير")
    p.add_argument("--no-backup", action="store_true", help="منع النسخ الاحتياطي")
    p.add_argument("--branches", action="store_true", help="السماح بالفروع")
    p.add_argument("--revoke", action="store_true", help="إصدار ترخيص بحالة معطّل")

    p.add_argument("--out", default="", help="ملف لحفظ الرمز")

    return p.parse_args()


def main():
    args = parse_args()

    shop_id = args.shop_id.strip().upper()
    shop_name = args.shop_name.strip() or "بقالة التجربة"
    owner_name = args.owner_name.strip() or "المالك"
    plan = args.plan.strip() or "trial"

    if args.features.strip():
        features = [
            x.strip()
            for x in args.features.split(",")
            if x.strip()
        ]
    else:
        features = DEFAULT_FEATURES.copy()

    now = datetime.now()
    issued_at = now.isoformat(timespec="milliseconds")
    expires_at = (now + timedelta(days=args.days)).isoformat(timespec="milliseconds")
    nonce = rand_token(8)

    payload = {
        "type": LICENSE_TYPE,
        "shopId": shop_id,
        "shopName": shop_name,
        "ownerName": owner_name,
        "plan": plan,
        "features": features,
        "maxDevices": args.max_devices,
        "issuedAt": issued_at,
        "expiresAt": expires_at,
        "graceDays": args.grace_days,
        "allowExport": not args.no_export,
        "allowBackup": not args.no_backup,
        "allowBranches": bool(args.branches),
        "status": "revoked" if args.revoke else "active",
        "nonce": nonce,
    }

    payload["sig"] = sign(shop_id, payload)

    json_str = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    b64 = b64url_no_pad(json_str.encode("utf-8"))
    code = PREFIX + b64

    print("")
    print("=== رمز الترخيص ===")
    print(code)
    print("")

    out_path = args.out.strip()
    if not out_path:
        stamp = now.strftime("%Y%m%d-%H%M%S")
        out_path = os.path.join("licenses", f"vendor-license-{shop_id}-{stamp}.txt")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(code + "\n")

    print(f"تم حفظ الرمز في: {out_path}")
    print("")
    print("الآن افتح التطبيق → ترخيص الناشر → الصق الرمز → استيراد الترخيص")


if __name__ == "__main__":
    main()
