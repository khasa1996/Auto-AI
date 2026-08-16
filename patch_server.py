import re

with open('backend/server.py', 'r') as f:
    content = f.read()

original_code = """    stats = {
        "total": len(all_items),
        "pending": sum(1 for d in all_items if d.get("status") == "pending_verification"),
        "approved": sum(1 for d in all_items if d.get("status") == "approved"),
        "rejected": sum(1 for d in all_items if d.get("status") == "rejected"),
        "avg_bid": round(sum(d.get("bid_per_lead", 0) for d in all_items) / max(1, len(all_items)), 2),
    }"""

optimized_code = """    pending = 0
    approved = 0
    rejected = 0
    total_bids = 0

    for d in all_items:
        status = d.get("status")
        if status == "pending_verification":
            pending += 1
        elif status == "approved":
            approved += 1
        elif status == "rejected":
            rejected += 1
        total_bids += d.get("bid_per_lead", 0)

    stats = {
        "total": len(all_items),
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "avg_bid": round(total_bids / max(1, len(all_items)), 2),
    }"""

new_content = content.replace(original_code, optimized_code)

if original_code in content:
    with open('backend/server.py', 'w') as f:
        f.write(new_content)
    print("Patched successfully")
else:
    print("Could not find the original code to patch")
