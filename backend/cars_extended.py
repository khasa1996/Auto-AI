"""Extended car database — popular models sold across India (2025-26)."""

# Diverse image pool for variety
IMG = {
    "hatch1": "https://images.unsplash.com/photo-1590510969783-9a0a04b9f5cc?w=800",
    "hatch2": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800",
    "hatch3": "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800",
    "hatch4": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
    "sedan1": "https://images.unsplash.com/photo-1583267746897-2cf415887172?w=800",
    "sedan2": "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800",
    "sedan3": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800",
    "suv1": "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800",
    "suv2": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800",
    "suv3": "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800",
    "suv4": "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800",
    "suv5": "https://images.unsplash.com/photo-1669226111568-7b2d3029b76a?w=800",
    "suv6": "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800",
    "suv7": "https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=800",
    "suv8": "https://images.unsplash.com/photo-1700093692456-056527c63d37?w=800",
    "suv9": "https://images.pexels.com/photos/34940284/pexels-photo-34940284.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "ev1": "https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=800",
    "ev2": "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800",
    "ev3": "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800",
    "lux1": "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
    "lux2": "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800",
    "lux3": "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800",
    "mpv1": "https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=800",
    "truck1": "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800",
}


def _c(cid, brand, model, variant, segment, fuel, trans, ex, on_road, mileage, cc, bhp, seats, boot, safety, gc, wait, img_key, tags):
    return {
        "id": cid, "brand": brand, "model": model, "variant": variant, "segment": segment,
        "fuel": fuel, "transmission": trans, "price_ex_showroom": ex, "price_on_road": on_road,
        "mileage_kmpl": mileage, "engine_cc": cc, "power_bhp": bhp, "seats": seats, "boot_litres": boot,
        "safety_rating": safety, "ground_clearance_mm": gc, "waiting_weeks": wait,
        "image": IMG[img_key], "tags": tags,
    }


EXTENDED_CARS = [
    # ---------- Maruti Suzuki ----------
    _c("maruti-alto-k10", "Maruti Suzuki", "Alto K10", "VXI+", "Hatchback", "Petrol", "Manual", 429000, 498000, 24.4, 998, 66, 5, 214, 2, 158, 1, "hatch1", ["entry", "city", "cheapest"]),
    _c("maruti-celerio", "Maruti Suzuki", "Celerio", "ZXI", "Hatchback", "Petrol", "Manual", 569000, 655000, 26.0, 998, 66, 5, 313, 2, 170, 2, "hatch2", ["fuel champ", "entry"]),
    _c("maruti-wagonr", "Maruti Suzuki", "Wagon R", "ZXI", "Hatchback", "Petrol", "Manual", 599000, 695000, 25.2, 1197, 89, 5, 341, 2, 165, 2, "hatch3", ["tall boy", "family"]),
    _c("maruti-spresso", "Maruti Suzuki", "S-Presso", "VXI+", "Micro SUV", "Petrol", "Manual", 459000, 525000, 24.4, 998, 66, 5, 240, 2, 180, 3, "hatch1", ["entry suv"]),
    _c("maruti-ignis", "Maruti Suzuki", "Ignis", "Zeta", "Crossover", "Petrol", "Manual", 599000, 695000, 20.9, 1197, 82, 5, 260, 2, 180, 3, "hatch4", ["crossover"]),
    _c("maruti-dzire", "Maruti Suzuki", "Dzire", "ZXI+", "Sedan", "Petrol", "Manual", 759000, 875000, 22.0, 1197, 89, 5, 382, 5, 163, 3, "sedan1", ["sedan", "compact"]),
    _c("maruti-ciaz", "Maruti Suzuki", "Ciaz", "Alpha", "Sedan", "Petrol", "Manual", 999000, 1150000, 20.0, 1462, 103, 5, 510, 3, 170, 4, "sedan2", ["sedan", "roomy"]),
    _c("maruti-ertiga", "Maruti Suzuki", "Ertiga", "ZXI+", "MPV", "Petrol", "Manual", 1099000, 1275000, 20.5, 1462, 102, 7, 209, 3, 185, 5, "mpv1", ["7 seater", "mpv"]),
    _c("maruti-xl6", "Maruti Suzuki", "XL6", "Alpha+", "MPV", "Petrol", "Automatic", 1349000, 1560000, 20.3, 1462, 102, 6, 209, 3, 185, 6, "mpv1", ["premium mpv", "6 seater"]),
    _c("maruti-jimny", "Maruti Suzuki", "Jimny", "Alpha", "Lifestyle SUV", "Petrol", "Manual", 1349000, 1560000, 16.4, 1462, 103, 4, 210, 3, 210, 8, "suv9", ["4x4", "offroad", "compact"]),
    _c("maruti-fronx", "Maruti Suzuki", "Fronx", "Alpha", "Coupe SUV", "Petrol", "Manual", 849000, 980000, 21.8, 998, 99, 5, 308, 4, 170, 3, "suv3", ["coupe suv", "stylish"]),
    _c("maruti-invicto", "Maruti Suzuki", "Invicto", "Alpha+", "MPV", "Petrol Hybrid", "Automatic", 2499000, 2900000, 23.2, 1987, 184, 7, 300, 5, 185, 10, "mpv1", ["premium hybrid mpv"]),
    # ---------- Hyundai ----------
    _c("hyundai-exter", "Hyundai", "Exter", "SX(O)", "Micro SUV", "Petrol", "Manual", 699000, 810000, 19.4, 1197, 81, 5, 391, 4, 185, 3, "suv2", ["micro suv", "safe"]),
    _c("hyundai-aura", "Hyundai", "Aura", "SX(O)", "Sedan", "Petrol", "Automatic", 899000, 1035000, 20.5, 1197, 82, 5, 402, 4, 165, 2, "sedan1", ["compact sedan"]),
    _c("hyundai-verna", "Hyundai", "Verna", "SX(O) Turbo", "Sedan", "Petrol", "Automatic", 1699000, 1960000, 18.0, 1482, 158, 5, 528, 5, 165, 5, "sedan3", ["premium sedan", "turbo"]),
    _c("hyundai-alcazar", "Hyundai", "Alcazar", "Signature", "Full SUV", "Diesel", "Automatic", 2099000, 2440000, 18.1, 1493, 114, 7, 180, 4, 200, 7, "suv5", ["7 seater", "premium"]),
    _c("hyundai-tucson", "Hyundai", "Tucson", "Signature", "Premium SUV", "Diesel", "Automatic", 3699000, 4300000, 18.0, 1995, 184, 5, 539, 5, 181, 9, "suv4", ["premium suv", "luxury"]),
    _c("hyundai-creta-ev", "Hyundai", "Creta Electric", "Excellence LR", "Electric SUV", "Electric", "Automatic", 2399000, 2560000, 473, 0, 169, 5, 433, 5, 190, 14, "ev1", ["electric", "long range", "suv"]),
    _c("hyundai-ioniq5", "Hyundai", "Ioniq 5", "Limited AWD", "Electric SUV", "Electric", "Automatic", 4603000, 5350000, 631, 0, 320, 5, 527, 5, 163, 12, "ev2", ["luxury ev"]),
    # ---------- Tata ----------
    _c("tata-tiago", "Tata", "Tiago", "XZ+", "Hatchback", "Petrol", "Manual", 569000, 655000, 19.8, 1199, 86, 5, 242, 4, 168, 2, "hatch3", ["safe hatch", "5 star"]),
    _c("tata-tigor", "Tata", "Tigor", "XZ+", "Sedan", "Petrol", "Manual", 699000, 810000, 19.3, 1199, 86, 5, 419, 4, 165, 2, "sedan1", ["compact sedan", "safe"]),
    _c("tata-altroz", "Tata", "Altroz", "XZ+", "Hatchback", "Petrol", "Manual", 769000, 885000, 19.3, 1199, 86, 5, 345, 5, 165, 3, "hatch4", ["5 star", "premium hatch"]),
    _c("tata-safari", "Tata", "Safari", "Accomplished+", "Full SUV", "Diesel", "Automatic", 2625000, 3050000, 16.3, 1956, 168, 7, 447, 5, 205, 6, "suv4", ["7 seater", "premium", "safe"]),
    _c("tata-tiago-ev", "Tata", "Tiago EV", "XZ+ LR", "Electric Hatch", "Electric", "Automatic", 899000, 960000, 315, 0, 75, 5, 242, 4, 168, 4, "ev1", ["affordable ev"]),
    _c("tata-punch-ev", "Tata", "Punch EV", "Empowered+ LR", "Electric SUV", "Electric", "Automatic", 1299000, 1395000, 421, 0, 122, 5, 366, 5, 187, 5, "ev1", ["compact ev", "5 star"]),
    # ---------- Mahindra ----------
    _c("mahindra-bolero", "Mahindra", "Bolero", "B6(O)", "Utility SUV", "Diesel", "Manual", 999000, 1150000, 16.0, 1493, 75, 7, 310, 2, 180, 4, "suv5", ["rural", "rugged", "7 seater"]),
    _c("mahindra-bolero-neo", "Mahindra", "Bolero Neo", "N10(O)", "Compact SUV", "Diesel", "Manual", 1099000, 1275000, 17.3, 1493, 100, 7, 325, 2, 180, 4, "suv5", ["rugged", "7 seater"]),
    _c("mahindra-marazzo", "Mahindra", "Marazzo", "M8", "MPV", "Diesel", "Manual", 1499000, 1740000, 17.3, 1497, 121, 8, 190, 4, 175, 5, "mpv1", ["8 seater", "mpv"]),
    _c("mahindra-xuv400-ev", "Mahindra", "XUV400 EV", "EL Pro 3x", "Electric SUV", "Electric", "Automatic", 1549000, 1660000, 456, 0, 148, 5, 418, 4, 205, 6, "ev3", ["electric suv"]),
    _c("mahindra-be6e", "Mahindra", "BE 6e", "Pack 3", "Electric Coupe SUV", "Electric", "Automatic", 1849000, 2050000, 682, 0, 281, 5, 455, 5, 207, 12, "ev2", ["electric", "futuristic"]),
    _c("mahindra-xev9e", "Mahindra", "XEV 9e", "Pack 3", "Electric SUV", "Electric", "Automatic", 2190000, 2420000, 656, 0, 281, 5, 663, 5, 207, 14, "ev2", ["electric flagship", "adas"]),
    # ---------- Kia ----------
    _c("kia-syros", "Kia", "Syros", "HTX+", "Compact SUV", "Petrol", "Automatic", 1299000, 1510000, 18.2, 998, 118, 5, 465, 4, 210, 6, "suv6", ["new launch", "feature rich"]),
    _c("kia-ev6", "Kia", "EV6", "GT Line", "Electric SUV", "Electric", "Automatic", 6095000, 7080000, 708, 0, 320, 5, 490, 5, 158, 11, "ev2", ["luxury ev"]),
    _c("kia-ev9", "Kia", "EV9", "GT Line", "Electric SUV", "Electric", "Automatic", 13290000, 15600000, 561, 0, 379, 7, 333, 5, 179, 16, "lux2", ["flagship ev", "luxury"]),
    # ---------- Toyota ----------
    _c("toyota-glanza", "Toyota", "Glanza", "V", "Hatchback", "Petrol", "Manual", 699000, 810000, 22.3, 1197, 89, 5, 318, 3, 170, 3, "hatch2", ["premium hatch"]),
    _c("toyota-taisor", "Toyota", "Taisor", "V", "Crossover", "Petrol", "Manual", 799000, 925000, 21.8, 998, 99, 5, 308, 4, 170, 3, "suv3", ["coupe suv"]),
    _c("toyota-rumion", "Toyota", "Rumion", "V", "MPV", "Petrol", "Manual", 1099000, 1275000, 20.5, 1462, 102, 7, 209, 3, 185, 5, "mpv1", ["7 seater"]),
    _c("toyota-camry", "Toyota", "Camry", "Hybrid", "Sedan", "Petrol Hybrid", "Automatic", 4827000, 5620000, 24.0, 2487, 215, 5, 524, 5, 160, 10, "sedan2", ["luxury hybrid sedan"]),
    _c("toyota-hilux", "Toyota", "Hilux", "High 4x4", "Pickup", "Diesel", "Automatic", 3690000, 4300000, 13.0, 2755, 201, 5, 1200, 4, 227, 14, "truck1", ["pickup", "4x4"]),
    _c("toyota-urban-cruiser-ev", "Toyota", "Urban Cruiser EV", "Empowered", "Electric SUV", "Electric", "Automatic", 1699000, 1820000, 425, 0, 142, 5, 433, 5, 190, 8, "ev3", ["new ev"]),
    _c("toyota-vellfire", "Toyota", "Vellfire", "Executive Lounge", "Luxury MPV", "Petrol Hybrid", "Automatic", 12000000, 14200000, 19.3, 2493, 188, 7, 450, 5, 165, 20, "lux1", ["luxury mpv"]),
    # ---------- Honda ----------
    _c("honda-city-hybrid", "Honda", "City e:HEV", "V", "Sedan", "Petrol Hybrid", "Automatic", 1999000, 2320000, 26.5, 1498, 124, 5, 506, 5, 165, 6, "sedan3", ["premium hybrid sedan"]),
    # ---------- MG ----------
    _c("mg-comet", "MG", "Comet EV", "Play", "Electric Hatch", "Electric", "Automatic", 699000, 750000, 230, 0, 41, 4, 175, 0, 165, 2, "ev1", ["city ev", "affordable"]),
    _c("mg-gloster", "MG", "Gloster", "Savvy 7-str 4x4", "Full SUV", "Diesel", "Automatic", 4232000, 4930000, 12.3, 1996, 215, 7, 343, 5, 210, 10, "suv5", ["luxury suv", "4x4"]),
    # ---------- Renault / Nissan ----------
    _c("renault-kwid", "Renault", "Kwid", "Climber", "Hatchback", "Petrol", "Manual", 479000, 550000, 22.3, 999, 67, 5, 279, 1, 184, 2, "hatch1", ["entry", "crossover look"]),
    _c("renault-kiger", "Renault", "Kiger", "RXZ Turbo", "Compact SUV", "Petrol", "Automatic", 1149000, 1330000, 20.5, 999, 99, 5, 405, 4, 205, 3, "suv3", ["compact suv"]),
    _c("renault-triber", "Renault", "Triber", "RXZ", "MPV", "Petrol", "Manual", 849000, 980000, 19.0, 999, 72, 7, 84, 4, 182, 3, "mpv1", ["7 seater", "budget mpv"]),
    _c("nissan-magnite", "Nissan", "Magnite", "XV Premium Turbo", "Compact SUV", "Petrol", "Automatic", 1099000, 1275000, 20.0, 999, 99, 5, 336, 4, 205, 3, "suv3", ["compact suv", "value"]),
    # ---------- Skoda / VW ----------
    _c("skoda-kylaq", "Skoda", "Kylaq", "Prestige", "Compact SUV", "Petrol", "Automatic", 1389000, 1610000, 19.7, 999, 115, 5, 446, 5, 189, 8, "suv6", ["new launch", "5 star"]),
    _c("skoda-kushaq", "Skoda", "Kushaq", "Style 1.5 TSI", "Mid SUV", "Petrol", "Automatic", 1749000, 2030000, 17.7, 1498, 148, 5, 385, 5, 188, 5, "suv4", ["5 star", "premium"]),
    _c("skoda-slavia", "Skoda", "Slavia", "Style 1.5 TSI", "Sedan", "Petrol", "Automatic", 1799000, 2090000, 18.1, 1498, 148, 5, 521, 5, 179, 4, "sedan3", ["premium sedan", "5 star"]),
    _c("skoda-kodiaq", "Skoda", "Kodiaq", "Sportline", "Full SUV", "Petrol", "Automatic", 4669000, 5440000, 13.0, 1984, 201, 7, 270, 5, 188, 10, "suv4", ["luxury suv", "7 seater"]),
    _c("skoda-superb", "Skoda", "Superb", "L&K", "Sedan", "Petrol", "Automatic", 5400000, 6290000, 14.7, 1984, 187, 5, 625, 5, 143, 12, "lux3", ["flagship sedan"]),
    _c("vw-virtus", "Volkswagen", "Virtus", "GT Line 1.5 TSI", "Sedan", "Petrol", "Automatic", 1899000, 2200000, 18.7, 1498, 148, 5, 521, 5, 179, 4, "sedan3", ["5 star", "performance sedan"]),
    _c("vw-taigun", "Volkswagen", "Taigun", "GT Plus 1.5 TSI", "Mid SUV", "Petrol", "Automatic", 1999000, 2320000, 17.9, 1498, 148, 5, 385, 5, 188, 5, "suv4", ["5 star", "premium"]),
    _c("vw-tiguan", "Volkswagen", "Tiguan", "Elegance", "Premium SUV", "Petrol", "Automatic", 4898000, 5700000, 12.7, 1984, 187, 5, 615, 5, 188, 11, "lux3", ["luxury suv"]),
    # ---------- Citroen / Jeep ----------
    _c("citroen-c3", "Citroen", "C3", "Feel", "Hatchback", "Petrol", "Manual", 619000, 715000, 19.8, 1199, 81, 5, 315, 0, 180, 2, "hatch4", ["hatch"]),
    _c("citroen-c3-aircross", "Citroen", "C3 Aircross", "Max 7-str", "Mid SUV", "Petrol", "Automatic", 1279000, 1480000, 18.5, 1199, 108, 7, 444, 0, 200, 5, "suv7", ["7 seater", "value"]),
    _c("citroen-ec3", "Citroen", "eC3", "Shine", "Electric Hatch", "Electric", "Automatic", 1299000, 1395000, 320, 0, 57, 5, 315, 0, 180, 3, "ev1", ["affordable ev"]),
    _c("citroen-basalt", "Citroen", "Basalt", "Max", "Coupe SUV", "Petrol", "Automatic", 1569000, 1820000, 18.5, 1199, 108, 5, 470, 0, 180, 4, "suv6", ["coupe suv"]),
    _c("jeep-compass", "Jeep", "Compass", "Model S 4x4", "Mid SUV", "Diesel", "Automatic", 3399000, 3950000, 16.3, 1956, 168, 5, 438, 5, 178, 8, "suv4", ["premium 4x4"]),
    _c("jeep-meridian", "Jeep", "Meridian", "Overland 4x4", "Full SUV", "Diesel", "Automatic", 4099000, 4770000, 15.0, 1956, 168, 7, 481, 5, 214, 9, "suv5", ["7 seater", "luxury 4x4"]),
    # ---------- Luxury: Mercedes, Audi, BMW, Volvo, Mini, Lexus, Porsche ----------
    _c("mercedes-gla", "Mercedes-Benz", "GLA", "220d 4MATIC", "Luxury SUV", "Diesel", "Automatic", 5390000, 6260000, 17.2, 1950, 190, 5, 435, 5, 205, 9, "lux1", ["luxury compact suv"]),
    _c("mercedes-glc", "Mercedes-Benz", "GLC", "300 4MATIC", "Luxury SUV", "Petrol", "Automatic", 7800000, 9100000, 16.8, 1999, 254, 5, 620, 5, 176, 12, "lux1", ["luxury suv"]),
    _c("mercedes-cclass", "Mercedes-Benz", "C-Class", "C 300 AMG Line", "Luxury Sedan", "Petrol", "Automatic", 6410000, 7450000, 16.3, 1999, 255, 5, 455, 5, 145, 10, "lux3", ["luxury sedan"]),
    _c("mercedes-eclass", "Mercedes-Benz", "E-Class", "E 450 4MATIC", "Luxury Sedan", "Petrol", "Automatic", 8880000, 10350000, 15.2, 2999, 375, 5, 540, 5, 140, 14, "lux3", ["flagship sedan"]),
    _c("mercedes-eqs", "Mercedes-Benz", "EQS", "580 4MATIC", "Luxury EV", "Electric", "Automatic", 16650000, 19500000, 677, 0, 516, 5, 610, 5, 140, 18, "ev2", ["luxury ev flagship"]),
    _c("bmw-3-series", "BMW", "3 Series", "330Li M Sport", "Luxury Sedan", "Petrol", "Automatic", 6250000, 7280000, 15.9, 1998, 254, 5, 480, 5, 135, 10, "lux3", ["luxury sedan"]),
    _c("bmw-x3", "BMW", "X3", "xDrive20d M Sport", "Luxury SUV", "Diesel", "Automatic", 7570000, 8800000, 17.0, 1995, 190, 5, 550, 5, 204, 12, "lux1", ["luxury suv"]),
    _c("audi-q3", "Audi", "Q3", "Premium Plus", "Luxury SUV", "Petrol", "Automatic", 4550000, 5290000, 14.5, 1984, 187, 5, 530, 5, 200, 10, "lux1", ["luxury compact suv"]),
    _c("audi-q5", "Audi", "Q5", "Technology", "Luxury SUV", "Petrol", "Automatic", 7200000, 8400000, 14.9, 1984, 249, 5, 550, 5, 208, 12, "lux1", ["luxury suv"]),
    _c("audi-a4", "Audi", "A4", "Premium Plus", "Luxury Sedan", "Petrol", "Automatic", 5450000, 6320000, 17.8, 1984, 187, 5, 460, 5, 142, 10, "lux3", ["luxury sedan"]),
    _c("volvo-xc40", "Volvo", "XC40", "Ultimate B5", "Luxury SUV", "Petrol", "Automatic", 4885000, 5680000, 15.0, 1969, 247, 5, 452, 5, 211, 11, "lux1", ["luxury safe suv"]),
    _c("volvo-xc60", "Volvo", "XC60", "Ultimate B5 Dark", "Luxury SUV", "Petrol", "Automatic", 7100000, 8250000, 13.8, 1969, 247, 5, 483, 5, 216, 12, "lux1", ["luxury suv"]),
    _c("volvo-xc90", "Volvo", "XC90", "Ultra B6 AWD", "Luxury SUV", "Petrol", "Automatic", 10150000, 11800000, 12.7, 1969, 295, 7, 314, 5, 238, 14, "lux2", ["7 seater luxury"]),
    _c("mini-cooper", "MINI", "Cooper", "Cooper S 3-dr", "Luxury Hatch", "Petrol", "Automatic", 4450000, 5200000, 17.5, 1998, 201, 4, 210, 5, 140, 12, "lux3", ["luxury hatch"]),
    _c("mini-countryman", "MINI", "Countryman", "S ALL4", "Luxury SUV", "Petrol", "Automatic", 5450000, 6340000, 15.4, 1998, 201, 5, 505, 5, 180, 13, "lux1", ["luxury compact suv"]),
]
