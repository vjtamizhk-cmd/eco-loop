import os
from PIL import Image, ImageDraw, ImageFont

def generate_evidence_images():
    out_dir = os.path.join(os.path.dirname(__file__), "static", "images", "evidence")
    os.makedirs(out_dir, exist_ok=True)

    evidence_types = [
        {
            "filename": "road_dumping.jpg",
            "title": "CCTV #CAM-W4-01 [LIVE DETECTION]",
            "violation": "ROAD DUMPING DETECTED",
            "bg_color": (35, 43, 54),
            "box_color": (239, 68, 68),
            "label": "AI DETECT: Domestic Waste Sack (98.2%)",
            "location": "North Ring Road / 4th Ave Asphalt"
        },
        {
            "filename": "public_littering.jpg",
            "title": "CCTV #CAM-W4-03 [LIVE DETECTION]",
            "violation": "PUBLIC LITTERING DETECTED",
            "bg_color": (28, 48, 40),
            "box_color": (245, 158, 11),
            "label": "AI DETECT: Discarded Plastic Bottle (96.5%)",
            "location": "Central Park Promenade Walkway"
        },
        {
            "filename": "mixed_waste.jpg",
            "title": "CCTV #CAM-W4-01 [OPTICAL SENSOR]",
            "violation": "NON-SEGREGATED DUMPING",
            "bg_color": (45, 38, 56),
            "box_color": (234, 88, 12),
            "label": "AI DETECT: Unsegregated Mixed Waste (94.1%)",
            "location": "Sector 8 Dustbin Perimeter"
        },
        {
            "filename": "plastic_burning.jpg",
            "title": "CCTV #CAM-W7-01 [THERMAL SENSOR]",
            "violation": "PLASTIC INCINERATION DETECTED",
            "bg_color": (58, 25, 25),
            "box_color": (220, 38, 38),
            "label": "THERMAL ALERT: Open Polymer Combustion (99.1%)",
            "location": "Silicon Blvd Rear Perimeter"
        },
        {
            "filename": "unauthorized_discard.jpg",
            "title": "CCTV #CAM-W7-02 [MOTION AI]",
            "violation": "UNAUTHORIZED DISCARD",
            "bg_color": (30, 41, 59),
            "box_color": (239, 68, 68),
            "label": "AI DETECT: Commercial Scrap Box (95.0%)",
            "location": "Lakeview Eco-Trail Gate 2"
        },
        {
            "filename": "default_litter.jpg",
            "title": "CCTV MUNICIPAL SURVEILLANCE",
            "violation": "WASTE DISPOSAL VIOLATION",
            "bg_color": (30, 41, 59),
            "box_color": (239, 68, 68),
            "label": "OPTICAL AI OBJECT DETECTION (97.8%)",
            "location": "Municipal Camera Zone"
        }
    ]

    for ev in evidence_types:
        filepath = os.path.join(out_dir, ev["filename"])
        img = Image.new("RGB", (640, 380), color=ev["bg_color"])
        draw = ImageDraw.Draw(img)

        # Draw grid lines for CCTV surveillance look
        for x in range(0, 640, 40):
            draw.line([(x, 0), (x, 380)], fill=(50, 65, 85), width=1)
        for y in range(0, 380, 40):
            draw.line([(0, y), (640, y)], fill=(50, 65, 85), width=1)

        # Draw CCTV header banner
        draw.rectangle([(0, 0), (640, 40)], fill=(15, 23, 42))
        draw.text((15, 12), f"REC ● {ev['title']}", fill=(239, 68, 68))
        draw.text((450, 12), "TIMESTAMP: 2026-08-20", fill=(148, 163, 184))

        # Draw AI Detection bounding box in center
        box_coords = [(160, 90), (480, 270)]
        draw.rectangle(box_coords, outline=ev["box_color"], width=3)

        # Draw corner brackets for AI viewfinder
        c_len = 18
        # Top-left
        draw.line([(155, 85), (155 + c_len, 85)], fill=ev["box_color"], width=3)
        draw.line([(155, 85), (155, 85 + c_len)], fill=ev["box_color"], width=3)
        # Top-right
        draw.line([(485, 85), (485 - c_len, 85)], fill=ev["box_color"], width=3)
        draw.line([(485, 85), (485, 85 + c_len)], fill=ev["box_color"], width=3)
        # Bottom-left
        draw.line([(155, 275), (155 + c_len, 275)], fill=ev["box_color"], width=3)
        draw.line([(155, 275), (155, 275 - c_len)], fill=ev["box_color"], width=3)
        # Bottom-right
        draw.line([(485, 275), (485 - c_len, 275)], fill=ev["box_color"], width=3)
        draw.line([(485, 275), (485, 275 - c_len)], fill=ev["box_color"], width=3)

        # AI Tag badge above box
        draw.rectangle([(160, 65), (480, 88)], fill=ev["box_color"])
        draw.text((170, 68), ev["label"], fill=(255, 255, 255))

        # Center target crosshair
        draw.line([(310, 180), (330, 180)], fill=ev["box_color"], width=2)
        draw.line([(320, 170), (320, 190)], fill=ev["box_color"], width=2)

        # Bottom Information bar
        draw.rectangle([(0, 330), (640, 380)], fill=(15, 23, 42))
        draw.text((15, 340), f"VIOLATION: {ev['violation']}", fill=(248, 113, 113))
        draw.text((15, 358), f"LOCATION: {ev['location']}", fill=(148, 163, 184))
        draw.text((450, 350), "STATUS: VERIFIED FLAGGED", fill=(34, 197, 94))

        img.save(filepath, "JPEG", quality=90)
    print(">>> Sample CCTV Evidence images generated successfully!")

if __name__ == "__main__":
    generate_evidence_images()
