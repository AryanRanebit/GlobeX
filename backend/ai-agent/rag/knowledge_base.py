"""
GlobeX AI — Trade Knowledge Base
Seed documents that populate the ChromaDB vector store on first run.
In production, replace / augment with real PDFs / regulatory documents.
"""
from __future__ import annotations

TRADE_DOCUMENTS: list[dict] = [
    # ── Export Regulations ──────────────────────────────────────────────────
    {
        "id": "exp-reg-001",
        "title": "General Export Regulations — India",
        "category": "export_regulations",
        "content": """
India's export regulations are governed by the Foreign Trade Policy (FTP) issued by the
Directorate General of Foreign Trade (DGFT). Exporters must obtain an Import Export Code
(IEC) before engaging in any export activity. The IEC is a 10-digit code issued by DGFT
and is mandatory for customs clearance.

Key requirements for exporters:
1. Import Export Code (IEC): Mandatory for all exporters. Apply online at dgft.gov.in.
2. Registration cum Membership Certificate (RCMC): Required if availing export benefits under FTP.
3. GST Registration: Exports are zero-rated under GST; exporters can claim refund of input tax credit.
4. Authorised Dealer Bank: Exporters must realise and repatriate export proceeds within 9 months.
5. FEMA Compliance: All export transactions must comply with Foreign Exchange Management Act.

Restricted and Prohibited Exports:
- Prohibited items: Wildlife products, items violating CITES, certain chemicals.
- Restricted items require specific licenses from DGFT (e.g., certain agricultural commodities, defence items).
- Canalized items: Can only be exported through designated agencies (e.g., PEC Ltd for certain goods).

Export Documentation:
- Shipping Bill (filed electronically via ICEGATE)
- Commercial Invoice
- Packing List
- Bill of Lading / Airway Bill
- Certificate of Origin (if required by importing country)
- Quality / Phytosanitary Certificate (if applicable)
""",
    },
    {
        "id": "exp-reg-002",
        "title": "EU Export Requirements",
        "category": "export_regulations",
        "content": """
Exporting to the European Union (EU) requires compliance with both the exporting country's
regulations and EU import requirements. The EU's Common Customs Tariff applies uniformly
across all 27 member states.

Key EU Import Requirements:
1. CE Marking: Required for many product categories (electronics, machinery, toys, medical devices).
2. REACH Compliance: Chemical products must comply with EU REACH regulations.
3. Food Safety Standards: Food and beverage exporters must comply with EU food hygiene regulations.
4. VAT Registration: May be required depending on the nature of the transaction.
5. EORI Number: The importer in the EU needs an Economic Operator Registration and Identification number.

Required Documents for EU Import:
- Commercial Invoice (with EUR value, HS code, country of origin)
- Packing List
- Bill of Lading or Airway Bill
- Certificate of Origin (EUR.1 or Form A for GSP benefits)
- Import Declaration (lodged by customs agent in EU)
- Conformity Certificates (CE, ISO as applicable)
- Phytosanitary Certificate (for agricultural goods)

India-EU Trade: India enjoys Generalised System of Preferences (GSP) benefits in some categories.
The India-EU Free Trade Agreement (FTA) is under negotiation and may further reduce duties.
""",
    },
    # ── Import Regulations ──────────────────────────────────────────────────
    {
        "id": "imp-reg-001",
        "title": "General Import Regulations — India",
        "category": "import_regulations",
        "content": """
Imports into India are regulated by the Customs Act 1962, the Foreign Trade Policy, and
notifications issued by the Ministry of Finance. The Central Board of Indirect Taxes and
Customs (CBIC) oversees customs administration.

Import Duties Structure:
1. Basic Customs Duty (BCD): Ranges from 0% to 150% depending on the product.
2. Integrated GST (IGST): Applied on the assessable value + BCD. Ranges from 0% to 28%.
3. Social Welfare Surcharge (SWS): 10% of BCD.
4. Countervailing Duty (CVD): Applied on specific products.
5. Anti-Dumping Duty: Applied on specific countries/products.

Import Licensing:
- Free imports: Most goods can be imported freely.
- Restricted imports: Require specific license from DGFT (e.g., second-hand goods, certain chemicals).
- Prohibited imports: Absolutely prohibited (e.g., certain wildlife products, pornographic material).
- Canalized imports: Must be imported through specified agencies (e.g., crude oil via PSUs).

Documentation for Import:
- Bill of Entry (filed electronically on ICEGATE)
- Commercial Invoice
- Packing List
- Bill of Lading / Airway Bill
- Import License (if applicable)
- Certificate of Origin
- Phytosanitary / Health Certificate (for food, agricultural products)
""",
    },
    # ── Customs Procedures ─────────────────────────────────────────────────
    {
        "id": "customs-001",
        "title": "Customs Clearance Procedures — India",
        "category": "customs_procedures",
        "content": """
Customs clearance in India is handled electronically through the ICEGATE portal.
The process for import and export clearance is as follows:

Export Customs Clearance:
1. Filing of Shipping Bill: Exporter or Customs House Agent (CHA) files the Shipping Bill on ICEGATE.
2. Risk Assessment: The system performs risk assessment — Green Channel (no examination),
   Yellow Channel (document verification), Red Channel (physical examination).
3. Let Export Order (LEO): Issued by Customs Officer after verification. Goods can be loaded.
4. Export General Manifest (EGM): Filed by the carrier after the vessel/aircraft departs.
5. Proof of Export: Shipping Bill with LEO date serves as proof for GST refund claims.

Import Customs Clearance:
1. Arrival of Goods: Carrier files Import General Manifest (IGM) before arrival.
2. Filing of Bill of Entry: Importer or CHA files Bill of Entry on ICEGATE within 30 days of arrival.
   - Into Home Consumption (white B/E): For direct use.
   - Into Warehousing (into bond B/E): For deferred duty payment.
   - Ex-Bond B/E: For clearance from bonded warehouse.
3. Duty Assessment: Customs assesses the duty payable.
4. Duty Payment: Paid electronically through authorized banks.
5. Examination and Out-of-Charge: Goods physically verified (if required) and released.

Important Timelines:
- Bill of Entry must be filed within 30 days of arrival of goods (else demurrage applies).
- Duty payment must be completed within 24 hours of assessment.
- Free days at port: Typically 3 days for import; demurrage/detention charges apply thereafter.
""",
    },
    # ── HS Codes ───────────────────────────────────────────────────────────
    {
        "id": "hs-001",
        "title": "HS Code System Overview",
        "category": "hs_codes",
        "content": """
The Harmonized System (HS) is an international nomenclature developed by the World Customs
Organization (WCO) used to classify traded products. It is used by more than 200 countries.

HS Code Structure:
- 2-digit Chapter: Broad category (e.g., Chapter 61 = Knitted/crocheted clothing)
- 4-digit Heading: Subcategory (e.g., 6105 = Men's shirts, knitted)
- 6-digit Subheading: International standard (e.g., 610510 = Of cotton)
- 8-digit: Country-level tariff line (India uses 8 digits in ITC HS)

Common HS Codes for Indian Exports:
- Cotton Yarn: 5205
- Cotton Fabric: 5208-5212
- Ready-made Garments (Cotton): 6105, 6106, 6203, 6204
- Leather Goods: 4202
- Pharmaceutical Products: 3004
- IT Software (on media): 8523
- Basmati Rice: 1006
- Spices: 0902 (Tea), 0904 (Pepper), 0906 (Cinnamon)
- Automobile Parts: 8708
- Engineering Goods (pumps): 8413
- Chemicals: Chapter 28-38
- Gems & Jewellery: 7102 (Diamonds), 7113 (Jewellery)

Finding the Right HS Code:
1. Use the DGFT Trade Intelligence portal (tradestat.commerce.gov.in)
2. Consult the Indian Trade Classification (Harmonised System) — ITC(HS)
3. Seek a Customs Advance Ruling for certainty on classification
""",
    },
    # ── Country-specific Rules ─────────────────────────────────────────────
    {
        "id": "country-usa-001",
        "title": "Trade Rules — United States of America",
        "category": "country_rules",
        "content": """
India–USA Trade Overview:
The USA is one of India's largest trading partners. There is no Free Trade Agreement between
India and the USA; trade is conducted under Most Favoured Nation (MFN) terms.

US Customs & Border Protection (CBP) Requirements:
1. Importer of Record: Must have a US EIN or CBP-assigned importer number.
2. Prior Notice: Food products require prior notice to FDA before arrival.
3. ISF Filing (10+2): Importers must file Importer Security Filing at least 24 hours before loading.
4. PGA Requirements: Products regulated by Partner Government Agencies (FDA, USDA, EPA, CPSC, FCC).
5. Country of Origin Marking: Products must be marked "Made in India" (or country of origin).

Key Regulations by Product:
- Textiles: Must comply with Textile Fiber Products Identification Act; country of origin labelling.
- Food Products: FDA registration mandatory; FSMA compliance required.
- Electronics: FCC compliance; may require FCC ID.
- Pharmaceuticals: FDA approval / ANDA required.
- Medical Devices: FDA 510(k) clearance or PMA required.

US Import Duties:
- MFN tariff rates apply to Indian goods.
- Section 301 tariffs apply on Chinese goods (not Indian, typically).
- GSP benefits for India were suspended in 2019.
- HTS (Harmonized Tariff Schedule of the United States) used for classification.
""",
    },
    {
        "id": "country-germany-001",
        "title": "Trade Rules — Germany / European Union",
        "category": "country_rules",
        "content": """
India–Germany Trade:
Germany is India's largest trading partner in Europe. As an EU member state, Germany applies
the EU-wide requirements covered in the "EU Export Requirements" document (CE marking, REACH,
EORI number, GSP/Form A, standard import documents). This document covers only the
Germany-specific layer on top of those EU-wide rules.

German Import Process:
1. Import Declaration: Filed electronically with German customs (Zollamt) through the ATLAS
   system; a German customs broker usually handles this.
2. Import VAT: 19% German VAT applies on imports (7% reduced rate for certain goods such as
   food staples); VAT-registered businesses can reclaim it as input tax.
3. Customs Duty: Assessed under the EU Common Customs Tariff and collected by German customs
   at the port or airport of entry.
4. Language: German authorities and buyers commonly expect product documentation, labels and
   manuals in German, beyond what EU law strictly requires.

Germany-Specific Product Notes:
- Textiles & Apparel: Country-of-origin labelling required; OEKO-TEX certification is strongly
  valued by German buyers.
- Machinery: German buyers expect complete technical documentation in German.
- Food & Beverage: Germany's LFGB food safety standard applies in addition to EU hygiene rules.
- Pharmaceuticals: Market access involves Germany's BfArM alongside the EMA process.

Logistics & Market Access:
- Hamburg is Germany's main seaport for cargo from India; Frankfurt am Main is the major
  airport for air freight.
- Germany is a common entry point even when the final buyer is elsewhere in the EU, since
  goods cleared in Germany move freely within the single market.
""",
    },
    {
        "id": "country-uae-001",
        "title": "Trade Rules — United Arab Emirates",
        "category": "country_rules",
        "content": """
India–UAE Trade:
The India–UAE Comprehensive Economic Partnership Agreement (CEPA) was signed in February 2022,
providing significant duty reductions for Indian exporters. This is one of India's most impactful
bilateral trade agreements.

CEPA Benefits:
- Zero duty on ~97% of Indian goods by value.
- Key beneficiary sectors: Gems & Jewellery, Textiles, Engineering, Pharmaceuticals.
- Certificate of Origin (CO) required to avail CEPA benefits (Form CEPA-COO).

UAE Customs Requirements:
1. Importer: Must be a UAE-registered entity or have a UAE agent.
2. Customs Duty: Standard 5% on CIF value for most goods (0% in Free Zones).
3. VAT: 5% UAE VAT on imports (excise goods attract higher rates).
4. Halal Certification: Mandatory for food products, especially meat.
5. Product Registration: Some products need registration with UAE authorities (pharmaceuticals, cosmetics).

Dubai as Hub:
- Jebel Ali Free Zone (JAFZA): A major hub; no customs duty within the free zone.
- Re-export: UAE is a major re-export hub; goods can be re-exported with minimal formalities.

Documents Required:
- Commercial Invoice (attested by Indian Chamber of Commerce + UAE Embassy)
- Packing List
- Certificate of Origin (attested)
- Bill of Lading / Airway Bill
- Halal Certificate (for food)
- COA / Technical Datasheet (for chemicals, cosmetics)
""",
    },
    # ── Shipping Guidance ──────────────────────────────────────────────────
    {
        "id": "shipping-001",
        "title": "Shipping & Logistics Guidance",
        "category": "shipping",
        "content": """
International Shipping — Key Concepts:

Incoterms 2020:
Incoterms define responsibilities between buyer and seller for cost, risk, and insurance.
- EXW (Ex Works): Seller packs goods at their premises; buyer bears all costs and risks.
- FOB (Free On Board): Seller delivers goods on board the vessel at the port of shipment.
- CIF (Cost Insurance Freight): Seller pays freight and insurance to destination port.
- DAP (Delivered at Place): Seller delivers to named place; buyer handles import customs.
- DDP (Delivered Duty Paid): Seller handles everything including import duties.
Recommendation for Indian exporters: FOB or CIF are most commonly used.

Modes of Shipment:
1. Sea Freight:
   - FCL (Full Container Load): Best for large volumes. Standard containers: 20ft, 40ft, 40ft HC.
   - LCL (Less than Container Load): For smaller shipments; consolidated with other cargo.
   - Transit times: India to Europe: 18–25 days; India to USA: 20–30 days; India to UAE: 5–7 days.

2. Air Freight:
   - Faster (2–7 days) but significantly more expensive.
   - Best for: high-value, time-sensitive, perishable goods.

3. Courier / Express:
   - DHL, FedEx, UPS for small shipments (typically <70 kg).

Key Indian Ports:
- Nhava Sheva (JNPT), Mumbai — Largest container port.
- Mundra Port, Gujarat — Second largest, well-connected to industrial hubs.
- Chennai Port — Major port for southern India.
- Kolkata / Haldia — Eastern India.

Shipping Documents:
- Bill of Lading (B/L): Issued by shipping line; title document for goods.
- Airway Bill (AWB): For air freight; non-negotiable.
- Freight Invoice: Charges for transportation.
- Insurance Certificate: Required under CIF terms.

INCOTERMS Impact on Customs Value:
- CIF value (Cost + Insurance + Freight) is used as the basis for import duty calculation in India and most countries.
""",
    },
    # ── Trade Compliance ────────────────────────────────────────────────────
    {
        "id": "compliance-001",
        "title": "Trade Compliance — AEO, Sanctions, Dual-Use",
        "category": "compliance",
        "content": """
Trade Compliance encompasses a range of obligations that exporters and importers must fulfil.

1. Authorised Economic Operator (AEO):
India's AEO programme (run by CBIC) certifies trusted traders for faster customs clearance.
- Tiers: AEO-T1 (basic), AEO-T2, AEO-T3 (highest level — operators).
- Benefits: Green channel clearance, deferred duty payment, reduced examination.
- Mutual Recognition Arrangements (MRAs) with several countries.

2. Sanctions Compliance:
Indian exporters must ensure they are not exporting to sanctioned entities or countries.
- OFAC (US): Office of Foreign Assets Control maintains SDN list.
- UN Security Council Sanctions: Applicable to all UN member states including India.
- EU Sanctions: Relevant for EU-bound goods or companies with EU nexus.
Best practice: Screen buyers/consignees against sanctions lists before each shipment.

3. Dual-Use Export Controls:
Items with both civilian and military applications require special export licenses.
- India's SCOMET (Special Chemicals, Organisms, Materials, Equipment & Technologies) list.
- Exporters must check if their product falls under SCOMET and obtain licence from DGFT.
- US EAR (Export Administration Regulations) applies if goods contain US-origin technology.

4. Anti-Bribery & Corruption:
- India's Prevention of Corruption Act and Foreign Corrupt Practices Act (for US-listed companies).
- Avoid facilitation payments; maintain records of all third-party payments.

5. Product Compliance / Standards:
- BIS (Bureau of Indian Standards): Mandatory certification for many products imported into India.
- FSSAI: Food Safety and Standards Authority of India licence for food products.
- CDSCO: Drug Controller for pharmaceuticals and medical devices.
""",
    },
]
