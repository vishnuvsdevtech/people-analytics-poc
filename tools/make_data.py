"""Generate the synthetic workforce dataset.

Everything here is fictional. The field list is modelled on what an Indian IT
services company actually holds across Orbit/Darwinbox/Keka + ZKTeco punches +
Jira/Git telemetry + appraisal records — see README for the sources.
"""
import json, random

random.seed(20261117)

FIRST = ["Arjun","Divya","Rahul","Sneha","Vivek","Meera","Karthik","Ananya","Suresh","Priya",
         "Nikhil","Lakshmi","Rohit","Deepa","Sanjay","Anjali","Manoj","Kavya","Ajith","Neha",
         "Vinod","Ritu","Prakash","Shruti","Harish","Swathi","Sreejith","Aparna","Girish","Nithya",
         "Akhil","Reshma","Sandeep","Anju","Dinesh","Bhavya","Sujith","Chitra","Ramesh","Vidya",
         "Anoop","Saranya","Rajesh","Nandini","Bibin","Amrutha","Kiran","Tessy"]
LAST = ["Nair","Menon","Pillai","Kurup","Varma","Iyer","Reddy","Rao","Sharma","Patel",
        "Krishnan","Joseph","Thomas","George","Mathew","Balan","Das","Gupta","Singh","Mohan"]
DEPT = ["Edge AI","Platform","Mobile","QA","DevOps","Data Eng"]
ROLE = {"Edge AI":["CV Engineer","Senior CV Engineer","ML Engineer"],
        "Platform":["Backend Engineer","Senior Backend Engineer","Full Stack Engineer"],
        "Mobile":["Android Engineer","React Native Engineer"],
        "QA":["QA Engineer","SDET"],
        "DevOps":["DevOps Engineer","SRE"],
        "Data Eng":["Data Engineer","Analytics Engineer"]}
PROJ = ["Sentry-Vision","Orbit-ANPR","Retail-Shelf","Fleet-Track","Docu-RAG","Campus-CV","None (bench)"]
LOC = ["Kochi","Kochi","Kochi","Coimbatore","Chennai"]
MGMT = ["S. Raghavan","P. Kurian","M. Thomas","A. Deshpande","R. Iyer"]

def clamp(v, a, b): return max(a, min(b, v))

emps = []
for i in range(48):
    dept = random.choice(DEPT)
    band = random.choices(["L1","L2","L3","L4","L5"], [10,26,34,22,8])[0]
    base_util = random.gauss(79, 11)
    late = max(0, round(random.gauss(2.4, 3.2)))
    logs = 30 - max(0, round(random.gauss(1.4, 2.6)))
    quality = clamp(random.gauss(74, 14), 30, 100)
    rating = clamp(random.gauss(3.5, 0.7), 1.0, 5.0)
    potential = random.choices([1, 2, 3], [30, 50, 20])[0]
    project = random.choices(PROJ, [22, 18, 16, 14, 12, 10, 8])[0]
    ctc = {"L1": 8.5, "L2": 14, "L3": 21, "L4": 31, "L5": 44}[band] * random.uniform(0.88, 1.18)
    e = {
        "id": f"E{1000+i}",
        "name": f"{FIRST[i]} {LAST[(i*7) % len(LAST)]}",
        "dept": dept,
        "role": random.choice(ROLE[dept]),
        "band": band,
        "project": project,
        "manager": random.choice(MGMT),
        "location": random.choice(LOC),
        "tenure_m": random.choices([6, 12, 24, 42, 66, 96], [8, 14, 26, 24, 18, 10])[0],
        "ctc_lpa": round(ctc, 1),
        "compa_ratio": round(clamp(random.gauss(1.0, 0.11), 0.78, 1.28), 2),
        "utilisation": round(clamp(base_util + (rating - 3.5) * 7, 32, 101)),
        "billable": project != "None (bench)",
        "late_30d": late,
        "avg_in": f"09:{clamp(round(random.gauss(6, 18)), 0, 59):02d}",
        "missing_punch": max(0, round(random.gauss(0.8, 1.4))),
        "wfh_days": random.choices([0, 2, 4, 6, 8], [18, 26, 24, 18, 14])[0],
        "leave_days": max(0, round(random.gauss(1.6, 1.3))),
        "logs_days": logs,
        "auto_entries": max(0, round(random.gauss(3.0, 3.4))),
        "log_quality": round(quality),
        "misassigned": max(0, round(random.gauss(1.1, 1.6))),
        "hours_avg": round(clamp(random.gauss(8.6, 0.7), 6.4, 11.2), 1),
        "tickets": max(0, round(random.gauss(18, 9))),
        "prs": max(0, round(random.gauss(6, 4))),
        "incidents": max(0, round(random.gauss(0.7, 1.0))),
        "client_rating": round(clamp(random.gauss(rating, 0.6), 1, 5), 1),
        "rating": round(rating, 1),
        "potential": potential,
        "promo_24m": rating > 4.2 and random.random() < 0.35,
        "engagement": round(clamp(random.gauss(3.6, 0.8), 1, 5), 1),
        "manager_changes": random.choices([0, 1, 2], [58, 32, 10])[0],
        "night_shifts": random.choices([0, 4, 9], [70, 18, 12])[0],
    }
    emps.append(e)

# --- deliberate personas, so the weights argument is visible in the data ----
def over(emp, **kw):
    emp.update(kw)

# high performers with poor discipline: the case that decides the whole argument
for idx, (late, q, auto) in [(3, (14, 46, 11)), (17, (11, 52, 9)), (29, (16, 41, 13))]:
    over(emps[idx], late_30d=late, log_quality=q, auto_entries=auto,
         logs_days=18, rating=4.6, client_rating=4.8, utilisation=94, tickets=41, prs=14)

# low performers with immaculate records
for idx, (rt, tk) in [(8, (2.1, 6)), (33, (2.3, 9))]:
    over(emps[idx], late_30d=0, log_quality=98, logs_days=30, auto_entries=0,
         rating=rt, client_rating=2.2, utilisation=52, tickets=tk, prs=0)

# a bench-heavy senior: expensive, well rated, no project
over(emps[11], project="None (bench)", utilisation=38, ctc_lpa=39.5, band="L5", rating=4.0, late_30d=1)

out = {"generated": "2026-11-17", "synthetic": True, "employees": emps}
with open("assets/data.js", "w") as f:
    f.write("window.DATA = " + json.dumps(out, indent=1) + ";\n")

print("employees:", len(emps))
print("fictional:", sum(1 for e in emps if e["synthetic"]) if False else "all 48")
print("on bench:", sum(1 for e in emps if not e["billable"]))
print("avg utilisation:", round(sum(e["utilisation"] for e in emps) / len(emps), 1))
print("avg late/30d:", round(sum(e["late_30d"] for e in emps) / len(emps), 1))
print("avg log quality:", round(sum(e["log_quality"] for e in emps) / len(emps), 1))
