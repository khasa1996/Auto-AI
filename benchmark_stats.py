import timeit
import random

# Generate dummy data
all_items = []
statuses = ["pending_verification", "approved", "rejected", "other"]
for _ in range(500):
    all_items.append({
        "status": random.choice(statuses),
        "bid_per_lead": random.randint(10, 100)
    })

def original():
    stats = {
        "total": len(all_items),
        "pending": sum(1 for d in all_items if d.get("status") == "pending_verification"),
        "approved": sum(1 for d in all_items if d.get("status") == "approved"),
        "rejected": sum(1 for d in all_items if d.get("status") == "rejected"),
        "avg_bid": round(sum(d.get("bid_per_lead", 0) for d in all_items) / max(1, len(all_items)), 2),
    }
    return stats

def optimized():
    pending = 0
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
    }
    return stats

assert original() == optimized()

print("Original:", timeit.timeit(original, number=10000))
print("Optimized:", timeit.timeit(optimized, number=10000))
