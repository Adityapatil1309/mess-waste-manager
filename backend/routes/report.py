from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Attendance, FoodCooked, Waste, Inventory
from auth import get_current_user
from datetime import date, timedelta
import csv
import io

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/csv/attendance")
def export_attendance_csv(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start = date.today() - timedelta(days=days)
    query = db.query(Attendance).filter(Attendance.date >= start)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Attendance.organization_code == current_user.organization_code)
    records = query.order_by(Attendance.date).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Meal", "Students"])
    for r in records:
        writer.writerow([r.date.isoformat(), r.meal, r.students])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{days}days.csv"}
    )


@router.get("/csv/waste")
def export_waste_csv(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start = date.today() - timedelta(days=days)
    query = db.query(Waste).filter(Waste.date >= start)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Waste.organization_code == current_user.organization_code)
    records = query.order_by(Waste.date).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Meal", "Waste (kg)", "Type", "Notes"])
    for r in records:
        writer.writerow([r.date.isoformat(), r.meal, r.waste_kg, r.waste_type, r.notes])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=waste_{days}days.csv"}
    )


@router.get("/csv/inventory")
def export_inventory_csv(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Inventory)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Inventory.organization_code == current_user.organization_code)
    records = query.order_by(Inventory.item_name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Item", "Quantity", "Unit", "Min Threshold", "Expiry Date", "Last Updated"])
    for r in records:
        writer.writerow([
            r.item_name, r.quantity_kg, r.unit, r.min_threshold,
            r.expiry_date.isoformat() if r.expiry_date else "",
            r.last_updated.isoformat() if r.last_updated else ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory.csv"}
    )


@router.get("/pdf/summary")
def generate_pdf_report(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    start = date.today() - timedelta(days=days)

    # Gather data
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    att_q = db.query(Attendance).filter(Attendance.date >= start)
    waste_q = db.query(Waste).filter(Waste.date >= start)
    food_q = db.query(FoodCooked).filter(FoodCooked.date >= start)
    if org_code:
        att_q = att_q.filter(Attendance.organization_code == org_code)
        waste_q = waste_q.filter(Waste.organization_code == org_code)
        food_q = food_q.filter(FoodCooked.organization_code == org_code)
    att_records = att_q.all()
    waste_records = waste_q.all()
    food_records = food_q.all()
    
    # Fetch inventory
    inv_q = db.query(Inventory)
    if org_code:
        inv_q = inv_q.filter(Inventory.organization_code == org_code)
    inv_records = inv_q.order_by(Inventory.item_name).all()

    total_att = sum(r.students for r in att_records) if att_records else 0
    avg_att = total_att / len(att_records) if att_records else 0
    total_waste = sum(r.waste_kg for r in waste_records) if waste_records else 0
    total_food = sum(r.rice_kg + r.dal_kg + r.vegetables_kg for r in food_records) if food_records else 0

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Title'],
        fontSize=20, textColor=colors.HexColor("#16a34a"),
        spaceAfter=30
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'],
        textColor=colors.HexColor("#2563eb"), spaceAfter=12
    )

    elements = []

    # Title
    elements.append(Paragraph("AI Smart Mess Waste Management Report", title_style))
    elements.append(Paragraph(
        f"Period: {start.isoformat()} to {date.today().isoformat()} ({days} days)",
        styles['Normal']
    ))
    elements.append(Spacer(1, 20))

    # Summary stats
    elements.append(Paragraph("Summary Statistics", heading_style))
    summary_data = [
        ["Metric", "Value"],
        ["Total Attendance Records", str(len(att_records))],
        ["Average Daily Attendance", str(round(avg_att))],
        ["Total Food Cooked (kg)", str(round(total_food, 1))],
        ["Total Waste Generated (kg)", str(round(total_waste, 1))],
        ["Waste Percentage", f"{round(total_waste / total_food * 100, 1)}%" if total_food > 0 else "0%"],
    ]

    t = Table(summary_data, colWidths=[3 * inch, 2 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#16a34a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f0fdf4")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bbf7d0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdf4")]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    # Inventory Section (New)
    if inv_records:
        elements.append(Paragraph("Current Inventory Status", heading_style))
        inv_data = [["Item Name", "Current Stock", "Unit", "Expiry"]]
        for r in inv_records:
            inv_data.append([
                r.item_name,
                str(r.quantity_kg),
                r.unit,
                r.expiry_date.isoformat() if r.expiry_date else "N/A"
            ])
        
        t3 = Table(inv_data, colWidths=[2 * inch, 1 * inch, 0.8 * inch, 1.2 * inch])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#a855f7")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e9d5ff")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3e8ff")]),
        ]))
        elements.append(t3)
        elements.append(Spacer(1, 20))

    # Attendance table
    if att_records:
        elements.append(Paragraph("Attendance Records (Recent)", heading_style))
        att_data = [["Date", "Meal", "Students"]]
        for r in sorted(att_records, key=lambda x: x.date, reverse=True)[:20]:
            att_data.append([r.date.isoformat(), r.meal, str(r.students)])

        t2 = Table(att_data, colWidths=[2 * inch, 1.5 * inch, 1.5 * inch])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563eb")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bfdbfe")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#eff6ff")]),
        ]))
        elements.append(t2)

    doc.build(elements)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=mess_report_{days}days.pdf"}
    )


@router.get("/summary")
def get_report_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start = date.today() - timedelta(days=days)

    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    att_q = db.query(Attendance).filter(Attendance.date >= start)
    waste_q = db.query(Waste).filter(Waste.date >= start)
    food_q = db.query(FoodCooked).filter(FoodCooked.date >= start)
    if org_code:
        att_q = att_q.filter(Attendance.organization_code == org_code)
        waste_q = waste_q.filter(Waste.organization_code == org_code)
        food_q = food_q.filter(FoodCooked.organization_code == org_code)

    att_records = att_q.all()
    waste_records = waste_q.all()
    food_records = food_q.all()

    total_att = sum(r.students for r in att_records) if att_records else 0
    avg_att = total_att / len(att_records) if att_records else 0
    total_waste = sum(r.waste_kg for r in waste_records) if waste_records else 0
    total_food = sum(r.rice_kg + r.dal_kg + r.vegetables_kg for r in food_records) if food_records else 0

    return {
        "period_days": days,
        "total_attendance_records": len(att_records),
        "avg_daily_attendance": round(avg_att),
        "total_food_cooked_kg": round(total_food, 1),
        "total_waste_kg": round(total_waste, 1),
        "waste_percentage": round(total_waste / total_food * 100, 1) if total_food > 0 else 0,
        "efficiency_score": round((1 - total_waste / total_food) * 100, 1) if total_food > 0 else 100
    }
