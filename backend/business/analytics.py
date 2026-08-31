import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.utils import timezone
from django.db.models import Prefetch

from .models import Transaction, TransactionOperation, TransactionOperationAmount


LOCAL_TZ = ZoneInfo("America/Argentina/Buenos_Aires")


def get_daypart(hour: int) -> str:
    if 6 <= hour <= 12:
        return "morning"
    elif 13 <= hour <= 17:
        return "afternoon"
    else:
        return "night"


def calculate_analytics(user, period="today", start_date_str=None, end_date_str=None):
    now_local = timezone.now().astimezone(LOCAL_TZ)

    if period == "today":
        if start_date_str:
            try:
                target_date = datetime.date.fromisoformat(start_date_str)
            except ValueError:
                target_date = now_local.date()
        else:
            target_date = now_local.date()

        start_dt = datetime.datetime.combine(target_date, datetime.time.min, tzinfo=LOCAL_TZ)
        end_dt = datetime.datetime.combine(target_date, datetime.time.max, tzinfo=LOCAL_TZ)
        period_label = f"Hoy ({target_date.strftime('%d/%m/%Y')})"

    elif period == "week":
        start_of_week = now_local.date() - datetime.timedelta(days=now_local.weekday())
        start_dt = datetime.datetime.combine(start_of_week, datetime.time.min, tzinfo=LOCAL_TZ)
        end_dt = datetime.datetime.combine(now_local.date(), datetime.time.max, tzinfo=LOCAL_TZ)
        period_label = f"Esta Semana ({start_of_week.strftime('%d/%m')} al {now_local.strftime('%d/%m/%Y')})"

    elif period == "month":
        start_of_month = now_local.date().replace(day=1)
        start_dt = datetime.datetime.combine(start_of_month, datetime.time.min, tzinfo=LOCAL_TZ)
        end_dt = datetime.datetime.combine(now_local.date(), datetime.time.max, tzinfo=LOCAL_TZ)
        period_label = f"Este Mes ({now_local.strftime('%B %Y')})"

    elif period == "custom" and start_date_str and end_date_str:
        try:
            s_date = datetime.date.fromisoformat(start_date_str)
            e_date = datetime.date.fromisoformat(end_date_str)
        except ValueError:
            s_date = now_local.date()
            e_date = now_local.date()

        start_dt = datetime.datetime.combine(s_date, datetime.time.min, tzinfo=LOCAL_TZ)
        end_dt = datetime.datetime.combine(e_date, datetime.time.max, tzinfo=LOCAL_TZ)
        period_label = f"{s_date.strftime('%d/%m/%Y')} al {e_date.strftime('%d/%m/%Y')}"

    else:
        # Fallback to today
        start_dt = datetime.datetime.combine(now_local.date(), datetime.time.min, tzinfo=LOCAL_TZ)
        end_dt = datetime.datetime.combine(now_local.date(), datetime.time.max, tzinfo=LOCAL_TZ)
        period_label = f"Hoy ({now_local.strftime('%d/%m/%Y')})"

    transactions = (
        Transaction.objects.filter(
            user=user,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        )
        .prefetch_related(
            "operations__amounts",
            "operations__provider",
            "client",
        )
        .order_by("created_at")
    )

    total_income = Decimal("0")
    total_expenses = Decimal("0")
    total_transactions_count = transactions.count()

    # Breakdown structures
    methods_breakdown = {
        "cash": Decimal("0"),
        "transfer": Decimal("0"),
        "card": Decimal("0"),
        "debt": Decimal("0"),
    }

    operations_breakdown = {
        "sale": {"label": "Ventas", "total": Decimal("0"), "count": 0},
        "sube": {"label": "Carga SUBE", "total": Decimal("0"), "count": 0},
        "phone": {"label": "Carga Celular", "total": Decimal("0"), "count": 0},
        "exchange": {"label": "Cambio (Ganancia)", "total": Decimal("0"), "count": 0},
        "payment": {"label": "Cobro de Fiados", "total": Decimal("0"), "count": 0},
        "provider": {"label": "Gastos Proveedor", "total": Decimal("0"), "count": 0},
        "expense": {"label": "Gastos Generales", "total": Decimal("0"), "count": 0},
        "loss": {"label": "Pérdidas", "total": Decimal("0"), "count": 0},
    }

    # Hourly buckets: 0 to 23
    hourly_data = {
        h: {
            "hour": h,
            "label": f"{h:02d}:00",
            "income": Decimal("0"),
            "expenses": Decimal("0"),
            "count": 0,
            "daypart": get_daypart(h),
        }
        for h in range(24)
    }

    # Dayparts
    dayparts_data = {
        "morning": {"name": "Mañana", "range": "06:00 a 13:00", "income": Decimal("0"), "expenses": Decimal("0"), "count": 0},
        "afternoon": {"name": "Tarde", "range": "13:00 a 18:00", "income": Decimal("0"), "expenses": Decimal("0"), "count": 0},
        "night": {"name": "Noche", "range": "18:00 a 02:00", "income": Decimal("0"), "expenses": Decimal("0"), "count": 0},
    }

    # Daily series (for multi-day periods)
    daily_timeline = {}

    for tx in transactions:
        tx_local = tx.created_at.astimezone(LOCAL_TZ)
        hour = tx_local.hour
        date_key = tx_local.strftime("%Y-%m-%d")
        dp_key = get_daypart(hour)

        if date_key not in daily_timeline:
            daily_timeline[date_key] = {
                "date": date_key,
                "label": tx_local.strftime("%d/%m"),
                "income": Decimal("0"),
                "expenses": Decimal("0"),
                "count": 0,
            }

        daily_timeline[date_key]["count"] += 1
        hourly_data[hour]["count"] += 1
        dayparts_data[dp_key]["count"] += 1

        for op in tx.operations.all():
            op_total = sum(a.amount for a in op.amounts.all())
            op_type = op.type

            # Categorize operation
            is_expense = op_type in [
                TransactionOperation.Type.PROVIDER,
                TransactionOperation.Type.PROVIDER_PAYMENT,
                TransactionOperation.Type.EXPENSE,
                TransactionOperation.Type.LOSS,
            ]

            if op_type == TransactionOperation.Type.EXCHANGE:
                # Store earnings is the commission fee
                effective_val = op.exchange_fee or Decimal("0")
            else:
                effective_val = op_total

            if is_expense:
                total_expenses += effective_val
                hourly_data[hour]["expenses"] += effective_val
                dayparts_data[dp_key]["expenses"] += effective_val
                daily_timeline[date_key]["expenses"] += effective_val
            else:
                total_income += effective_val
                hourly_data[hour]["income"] += effective_val
                dayparts_data[dp_key]["income"] += effective_val
                daily_timeline[date_key]["income"] += effective_val

            # Operations breakdown
            norm_type = "provider" if op_type == TransactionOperation.Type.PROVIDER_PAYMENT else op_type
            if norm_type in operations_breakdown:
                operations_breakdown[norm_type]["total"] += effective_val
                operations_breakdown[norm_type]["count"] += 1

            # Methods breakdown
            for amt in op.amounts.all():
                if amt.method in methods_breakdown:
                    methods_breakdown[amt.method] += amt.amount

    net_balance = total_income - total_expenses
    avg_ticket = (total_income / total_transactions_count) if total_transactions_count > 0 else Decimal("0")

    # Find peak hour
    peak_hour = max(hourly_data.values(), key=lambda x: x["income"], default=None)

    return {
        "period": period,
        "period_label": period_label,
        "start_date": start_dt.isoformat(),
        "end_date": end_dt.isoformat(),
        "summary": {
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "net_balance": float(net_balance),
            "total_transactions": total_transactions_count,
            "average_ticket": round(float(avg_ticket), 2),
            "peak_hour": peak_hour["label"] if peak_hour and peak_hour["income"] > 0 else None,
            "peak_hour_income": float(peak_hour["income"]) if peak_hour else 0.0,
        },
        "dayparts": {
            k: {
                "name": v["name"],
                "range": v["range"],
                "income": float(v["income"]),
                "expenses": float(v["expenses"]),
                "count": v["count"],
            }
            for k, v in dayparts_data.items()
        },
        "hourly": [
            {
                "hour": v["hour"],
                "label": v["label"],
                "income": float(v["income"]),
                "expenses": float(v["expenses"]),
                "count": v["count"],
                "daypart": v["daypart"],
            }
            for v in hourly_data.values()
        ],
        "methods": {
            k: float(v) for k, v in methods_breakdown.items()
        },
        "operations": {
            k: {
                "label": v["label"],
                "total": float(v["total"]),
                "count": v["count"],
            }
            for k, v in operations_breakdown.items()
        },
        "daily_timeline": [
            {
                "date": v["date"],
                "label": v["label"],
                "income": float(v["income"]),
                "expenses": float(v["expenses"]),
                "count": v["count"],
            }
            for v in sorted(daily_timeline.values(), key=lambda x: x["date"])
        ],
    }

