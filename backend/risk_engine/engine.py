import statistics
from collections import defaultdict
from typing import Dict, Any, List

def clamp(value: float, min_val: float = 0, max_val: float = 100) -> int:
    """Clamp a float to an integer between min_val and max_val."""
    return int(max(min_val, min(value, max_val)))

def analyze(application_id: str, financial_data: Dict[str, Any], requested_amount: float) -> Dict[str, Any]:
    txns = financial_data.get("bank_transactions", [])
    gst_records = financial_data.get("gst_records", [])
    
    # 1. CASH FLOW STABILITY
    monthly_credits = defaultdict(float)
    monthly_debits = defaultdict(float)
    
    for t in txns:
        month = t["date"][:7]  # Extract YYYY-MM
        if t["type"] == "CREDIT":
            monthly_credits[month] += t["amount"]
        elif t["type"] == "DEBIT":
            monthly_debits[month] += t["amount"]
            
    months = sorted(list(set(monthly_credits.keys()) | set(monthly_debits.keys())))
    net_cash_flows = []
    negative_months = 0
    
    for m in months:
        ncf = monthly_credits[m] - monthly_debits[m]
        net_cash_flows.append(ncf)
        if ncf < 0:
            negative_months += 1
            
    if not net_cash_flows:
        cf_score = 0
    else:
        mean_ncf = statistics.mean(net_cash_flows)
        if mean_ncf <= 0:
            base_cf = 25
        else:
            std_ncf = statistics.pstdev(net_cash_flows) if len(net_cash_flows) > 1 else 0
            cv_cf = std_ncf / abs(mean_ncf)
            base_cf = 100 - (cv_cf * 100)
            
        base_cf -= (10 * negative_months)
        cf_score = clamp(round(base_cf))

    # 2. REVENUE STABILITY
    sales_by_month = defaultdict(float)
    for t in txns:
        if t["type"] == "CREDIT" and t["category"] == "SALES":
            month = t["date"][:7]
            sales_by_month[month] += t["amount"]
            
    # Sort keys to ensure deterministic ordering for standard deviation
    sales_months = sorted(list(sales_by_month.keys()))
    sales_values = [sales_by_month[m] for m in sales_months]
    
    if len(sales_values) >= 2:
        mean_sales = statistics.mean(sales_values)
        if mean_sales == 0:
            rev_score = 0
        else:
            std_sales = statistics.pstdev(sales_values)
            cv_sales = std_sales / mean_sales
            rev_score = clamp(round(100 - (cv_sales * 100)))
    else:
        rev_score = 50  # Fallback for insufficient data
        
    # 3. DEBT HEALTH (Proxy)
    total_credits = sum(t["amount"] for t in txns if t["type"] == "CREDIT")
    total_debits = sum(t["amount"] for t in txns if t["type"] == "DEBIT")
    
    if total_credits == 0:
        debt_score = 0
    else:
        debit_ratio = total_debits / total_credits
        if debit_ratio <= 0.50:
            debt_score = 100
        elif debit_ratio >= 1.50:
            debt_score = 0
        else:
            debt_score = clamp(round(100 - ((debit_ratio - 0.50) / 1.00) * 100))

    # 4. GST CONSISTENCY
    gst_sales = {r["month"]: r["reported_sales"] for r in gst_records}
    
    # Sort overlapping months to ensure deterministic iteration order
    overlapping_months = sorted(list(set(sales_by_month.keys()).intersection(gst_sales.keys())))
    
    ratios = []
    gst_diff_flag = False
    for m in overlapping_months:
        b_sales = sales_by_month[m]
        g_sales = gst_sales[m]
        diff_ratio = abs(b_sales - g_sales) / max(g_sales, 1)
        ratios.append(max(0, 1 - diff_ratio))
        if diff_ratio > 0.20:
            gst_diff_flag = True
            
    rec_score = (sum(ratios) / len(ratios) * 100) if ratios else 50
    filed_count = sum(1 for r in gst_records if r.get("filing_status") == "FILED")
    filing_score = (filed_count / len(gst_records) * 100) if gst_records else 0
    
    gst_not_filed_flag = any(r.get("filing_status") != "FILED" for r in gst_records)
    gst_score = clamp(round((0.7 * filing_score) + (0.3 * rec_score)))
    
    # 5. TRANSACTION RISK
    amounts = [abs(t["amount"]) for t in txns]
    med_amt = statistics.median(amounts) if amounts else 0
    threshold = max(3 * med_amt, 250000)
    
    flagged_txns = []
    specific_flags = []  # List preserves deterministic order
    
    for t in txns:
        desc_lower = t["description"].lower()
        amt = abs(t["amount"])
        
        is_unknown = t["category"] == "UNKNOWN"
        has_crypto = "crypto" in desc_lower
        has_unreg = "unregistered" in desc_lower
        has_uninv = "uninvoiced" in desc_lower
        is_large = amt > threshold
        
        if is_unknown or has_crypto or has_unreg or has_uninv or is_large:
            flagged_txns.append(t)
            if has_crypto or has_unreg: 
                if "Unregistered crypto transfer detected" not in specific_flags:
                    specific_flags.append("Unregistered crypto transfer detected")
            if has_uninv: 
                if "Large uninvoiced deposit detected" not in specific_flags:
                    specific_flags.append("Large uninvoiced deposit detected")
                    
    # Deterministic count of unique transaction IDs
    unique_flagged = len(set(t["transaction_id"] for t in flagged_txns))
    txn_base = 100 - (25 * unique_flagged)
    if txns and (unique_flagged / len(txns)) > 0.10:
        txn_base -= 10
    txn_score = clamp(round(txn_base))
    
    # 6. FINAL AGGREGATION
    weighted_score = (
        (0.35 * cf_score) + 
        (0.20 * rev_score) + 
        (0.25 * debt_score) + 
        (0.10 * gst_score) + 
        (0.10 * txn_score)
    )
    overall_score = clamp(round(weighted_score))
    
    rec_limit = round(requested_amount * (overall_score / 100.0))
    rec_limit = max(0, min(rec_limit, requested_amount))
    
    # Flags and Explanations Construction
    risk_flags = []
    if unique_flagged > 0:
        risk_flags.append(f"{unique_flagged} unusual transactions detected")
        
    risk_flags.extend(specific_flags)
    
    if gst_diff_flag:
        risk_flags.append("GST reported sales differ significantly from bank sales")
    if gst_not_filed_flag:
        risk_flags.append("One or more GST filings are not marked as FILED")
        
    explanations = [
        "Debt health uses a synthetic debit-burden proxy because no debt schedule is available."
    ]
    if negative_months == 0:
        explanations.append("Monthly net cash flow remains positive across the available period.")
    else:
        explanations.append(f"Monthly net cash flow was negative in {negative_months} months.")
        
    if rev_score >= 80:
        explanations.append("Revenue shows high month-to-month stability.")
    else:
        explanations.append("Revenue shows moderate-to-high month-to-month variation.")
        
    if gst_score >= 90:
        explanations.append("GST filings are highly consistent with bank records.")
    
    if unique_flagged > 0:
        explanations.append("Unusual transactions were identified using deterministic rules.")
    else:
        explanations.append("No critical transactional anomalies were identified.")

    return {
        "application_id": application_id,
        "overall_score": overall_score,
        "recommended_credit_limit": float(rec_limit),
        "metrics": {
            "cash_flow_stability": cf_score,
            "revenue_stability": rev_score,
            "debt_health": debt_score,
            "gst_consistency": gst_score,
            "transaction_risk": txn_score
        },
        "risk_flags": risk_flags,
        "explanation": explanations
    }