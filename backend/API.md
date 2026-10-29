# GlobeX AI — API Reference

**Base URL**: `http://localhost:3000/api/v1`

**Docs**: http://localhost:3000/api-docs (Swagger UI)

---

## 🔐 Authentication

### Signup
```http
POST /auth/signup
Content-Type: application/json

{
  "name": "Rajesh Kumar",
  "email": "rajesh@spices.in",
  "password": "Secure@123",
  "companyName": "Kumar Spices Pvt Ltd",
  "companyType": "Manufacturer",
  "industry": "Food & Spices"
}

Response: 201 Created
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id": "...", "email": "...", ... },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "rajesh@spices.in",
  "password": "Secure@123"
}

Response: 200 OK
{
  "success": true,
  "message": "Login successful",
  "data": { "user": {...}, "tokens": {...} }
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}

Response: 200 OK
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Get Profile
```http
GET /auth/profile
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Rajesh Kumar",
    "email": "rajesh@spices.in",
    "role": "USER",
    "companyName": "Kumar Spices Pvt Ltd",
    "companyType": "Manufacturer",
    "industry": "Food & Spices",
    "isVerified": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Update Profile
```http
PATCH /auth/profile
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Rajesh Kumar Singh",
  "companyName": "Kumar Spices International"
}

Response: 200 OK
{
  "success": true,
  "data": { "id": "...", "name": "Rajesh Kumar Singh", ... }
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📦 Products

### Create Product
```http
POST /products
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "productName": "Organic Turmeric Powder",
  "category": "Spices",
  "description": "Premium quality organic turmeric from Erode...",
  "hsCode": "0910.30",
  "targetCountries": ["US", "DE", "GB", "AU"],
  "unitPrice": 4.5,
  "currency": "USD",
  "certifications": ["FSSAI", "USDA Organic", "ISO 22000"]
}

Response: 201 Created
```

### Get All Products
```http
GET /products
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productName": "Organic Turmeric Powder",
      "category": "Spices",
      ...
    }
  ]
}
```

### Get Product by ID
```http
GET /products/:id
Authorization: Bearer <accessToken>

Response: 200 OK
```

### Delete Product
```http
DELETE /products/:id
Authorization: Bearer <accessToken>

Response: 200 OK
```

---

## 🌍 Market Intelligence

### Analyze Market (Create Background Research Job)
```http
POST /market/analyze
Authorization: Bearer <accessToken>
X-Idempotency-Key: <optional-client-idempotency-key>
Content-Type: application/json

{
  "product": "Organic Honey",
  "productId": "uuid",
  "targetRegions": ["Europe", "North America"]
}

Response: 200 OK
{
  "success": true,
  "message": "Market analysis job started",
  "data": {
    "jobId": "f74e6f9a-1122-44bb-88cc-9900aabbccdd",
    "id": "f74e6f9a-1122-44bb-88cc-9900aabbccdd",
    "status": "queued",
    "createdAt": "2026-10-11T12:00:00Z"
  }
}
```

### Get Research Job Status & Result
```http
GET /market/analyze/status/:jobId
Authorization: Bearer <accessToken>

Response: 200 OK (when succeeded)
{
  "success": true,
  "data": {
    "id": "f74e6f9a-1122-44bb-88cc-9900aabbccdd",
    "jobId": "f74e6f9a-1122-44bb-88cc-9900aabbccdd",
    "status": "succeeded",
    "state": "succeeded",
    "isCompleted": true,
    "attempts": 1,
    "maxRetries": 3,
    "result": {
      "product": "Organic Honey",
      "category": "Natural Foods",
      "candidateHsCode": "0409.00",
      "analyzedAt": "2026-10-11T12:00:05Z",
      "summary": "Market analysis for Organic Honey identified strong EU/US demand.",
      "recommendedCountries": [
        {
          "country": "Germany",
          "countryCode": "DE",
          "demandScore": 91,
          "growthRate": "18%",
          "competition": "Medium",
          "marketSize": "$2.4B",
          "trend": "Growing",
          "insights": "Largest organic food market in Europe."
        }
      ]
    },
    "error": null,
    "createdAt": "2026-10-11T12:00:00Z",
    "updatedAt": "2026-10-11T12:00:05Z"
  }
}
```

### List User Research Jobs
```http
GET /market/jobs?limit=20&offset=0
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "message": "Research jobs retrieved successfully",
  "data": [
    {
      "id": "f74e6f9a-1122-44bb-88cc-9900aabbccdd",
      "jobId": "f74e6f9a-1122-44bb-88cc-9900aabbccdd",
      "status": "succeeded",
      "isCompleted": true,
      "attempts": 1,
      "maxRetries": 3,
      "result": { ... },
      "createdAt": "2026-10-11T12:00:00Z"
    }
  ]
}
```

### Get Opportunities
```http
GET /market/opportunities
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "country": "Germany",
      "demandScore": 91,
      "growthRate": "18%",
      ...
    }
  ]
}
```

---

## 🏢 Buyers

### Search Buyers
```http
GET /buyers?q=spice&country=US&minLeadScore=70&page=1&limit=20&sortBy=leadScore&sortDir=desc
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "companyName": "Example Apparel Importer Inc.",
      "country": "United States",
      "industry": "Apparel Import & Distribution",
      "leadScore": 45,
      "website": "https://example.com",
      "email": null,
      "verificationStatus": "partially_verified",
      "sourceUrl": "https://source-site.example/importers-page"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 125,
      "totalPages": 7
    }
  }
}
```

### Discover Buyers (grounded live search)
```http
POST /buyers/discover
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "product": "Cotton Trousers",
  "targetCountries": ["United States"],
  "hsCode": "6204.62"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "product": "Cotton Trousers",
    "targetCountries": ["United States"],
    "searchedAt": "2026-01-01T00:00:00.000Z",
    "provider": "gemini_agent",
    "dataSourceMode": "live_provider",
    "totalCandidatesDiscovered": 4,
    "totalUniqueBuyers": 3,
    "queriesUsed": ["importers of \"Cotton Trousers\" in United States"],
    "buyers": [ /* EnrichedBuyerRecord[] — see below */ ]
  }
}
```

The discovery pipeline asks the Python agent to run Gemini with Google Search
grounding. The agent keeps only companies attributable to a real search-result
citation and attaches the source URL; the Express pipeline deduplicates,
verifies evidence, scores, and persists each buyer. Returned companies are
prospects with web evidence — customs records, purchase history, and contact
details are not claimed. When grounded search finds nothing credible, `buyers`
is empty and nothing is persisted. Provider failures return an honest
`502`/`503` error instead of fabricated companies.

### Get Buyer Details
```http
GET /buyers/:id
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "companyName": "Example Apparel Importer Inc.",
    "country": "United States",
    "countryCode": "US",
    "industry": "Apparel Import & Distribution",
    "website": "https://example.com",
    "email": null,
    "leadScore": 45,
    "isVerified": false,
    "leads": [...],
    "_count": { "outreaches": 3 }
  }
}
```

---

## 📊 Leads

### Create Lead
```http
POST /leads
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "buyerId": "uuid",
  "productId": "uuid",
  "notes": "Interested in 5MT/month. Requested samples.",
  "nextAction": "Send sample shipment",
  "nextActionAt": "2024-02-01T10:00:00Z"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "buyerId": "uuid",
    "leadScore": 82,
    "status": "NEW",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get All Leads
```http
GET /leads
GET /leads?status=NEGOTIATION
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "NEGOTIATION",
      "leadScore": 91,
      "buyer": { "companyName": "...", "country": "..." },
      "product": { "productName": "..." }
    }
  ]
}
```

### Update Lead
```http
PATCH /leads/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "status": "CONVERTED",
  "leadScore": 95,
  "notes": "Deal closed for 10MT/month"
}

Response: 200 OK
```

### Delete Lead
```http
DELETE /leads/:id
Authorization: Bearer <accessToken>

Response: 200 OK
```

### Get Lead Stats
```http
GET /leads/stats
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    { "status": "NEW", "_count": { "_all": 5 } },
    { "status": "CONTACTED", "_count": { "_all": 3 } },
    { "status": "NEGOTIATION", "_count": { "_all": 2 } }
  ]
}
```

---

## 💌 Outreach

### Generate Outreach
```http
POST /outreach/generate
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "buyerId": "uuid",
  "tone": "professional",
  "language": "en",
  "customContext": "They're looking for organic suppliers"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject": "Export Partnership Inquiry — Kumar Spices × Example Apparel Importer",
    "content": "Dear Example Apparel Importer Procurement Team...",
    "tone": "professional",
    "language": "en",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Outreach History
```http
GET /outreach/history
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "subject": "Export Partnership Inquiry",
      "content": "...",
      "status": "DRAFT",
      "buyer": { "companyName": "...", "country": "..." },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## ✅ Compliance

### Get Compliance by Country
```http
GET /compliance/:country
GET /compliance/US
GET /compliance/Germany
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": {
    "country": "United States",
    "countryCode": "US",
    "totalRequirements": 3,
    "requirements": [
      {
        "id": "uuid",
        "documentName": "FDA Registration",
        "description": "All food facilities...",
        "category": "Registration",
        "isRequired": true,
        "processingTime": "1–2 weeks"
      }
    ],
    "grouped": {
      "Registration": [...],
      "Licensing": [...],
      "Labeling": [...]
    }
  }
}
```

### Get All Available Countries
```http
GET /compliance/countries
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    { "country": "Germany", "countryCode": "DE" },
    { "country": "United States", "countryCode": "US" },
    { "country": "United Arab Emirates", "countryCode": "AE" }
  ]
}
```

---

## 📈 Dashboard

### Get Dashboard Summary
```http
GET /dashboard
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": {
    "overview": {
      "buyersFound": 125,
      "countriesAnalyzed": 18,
      "activeLeads": 35,
      "avgLeadScore": 84,
      "totalLeads": 50,
      "productsRegistered": 3,
      "outreachSent": 12
    },
    "pipeline": [
      { "status": "NEW", "count": 12 },
      { "status": "CONTACTED", "count": 8 },
      { "status": "NEGOTIATION", "count": 15 }
    ],
    "topCountries": [
      {
        "country": "Germany",
        "demandScore": 91,
        "growthRate": "18%",
        "product": "Organic Turmeric"
      }
    ],
    "recentLeads": [...]
  }
}
```

---

## ❌ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Common Status Codes**:
- `400` — Bad request (validation error)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `409` — Conflict (e.g. email already exists)
- `422` — Validation failed
- `429` — Rate limit exceeded
- `500` — Server error

---

## 🔄 Pagination

Any list endpoint supports pagination:

```http
GET /buyers?page=2&limit=50
```

Query params:
- `page` (default: 1)
- `limit` (default: 20, max: 100)

Response includes:
```json
{
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 50,
      "total": 250,
      "totalPages": 5
    }
  }
}
```

---

## 🔄 Sorting

List endpoints support sorting:

```http
GET /buyers?sortBy=leadScore&sortDir=desc
```

Available fields per endpoint shown in Swagger docs.

---

## 📝 Demo Credentials

After seeding:

```
Email: demo@spicesexport.in
Password: Demo@123
```

---

**See Swagger UI for interactive testing**: http://localhost:3000/api-docs
