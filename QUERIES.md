# 📊 Queries implementate

Il sistema implementa 4 query richieste dal progetto, suddivise in:

- Query parametriche di tipo lookup (≥2, di cui ≥1 cross-database)
- Query analitiche (≥2, di cui ≥1 cross-database)

---

# Q1 — Feed amici
## Tipo
Lookup — Cross-Database

## Input
- userId
- limit (default = 20)

## Logica
1. Neo4j: recupera gli amici dell’utente tramite relazione `KNOWS`
2. MongoDB: seleziona i post creati da quegli amici (`postCreators → posts`)
3. Ordina per `creationDate` decrescente
4. Restituisce i primi N risultati

## Endpoint
GET /api/q1/feed?userId=933&limit=20

---

# Q2 — Profilo utente
## Tipo
Lookup — Neo4j

## Input
- userId

## Logica
1. Recupera il nodo `Person`
2. Conta gli amici tramite relazione `KNOWS`
3. Restituisce informazioni di profilo + numero amici

## Endpoint
GET /api/q2/profile?userId=933

---

# Q3 — Top influencer
## Tipo
Analitica — Neo4j

## Input
- topN (default = 10)

## Logica
1. Per ogni persona conta il numero di amici (`KNOWS`)
2. Ordina per numero amici decrescente
3. Restituisce i primi N utenti più connessi

## Endpoint
GET /api/q3/influencers?topN=10

---

# Q4 — Top città per attività
## Tipo
Analitica — Cross-Database

## Input
- topN (default = 10)

## Logica
1. Neo4j: trova i residenti di ogni città (`IS_LOCATED_IN`)
2. MongoDB: calcola attività per autore (#post + #comment)
3. Backend: join tra residenti e attività
4. Somma attività per città
5. Restituisce le top N città più attive

## Endpoint
GET /api/q4/city-activity?topN=10

---

# ✅ Copertura requisiti progetto

## Lookup
- Q1 (cross-db)
- Q2

## Analitiche
- Q3
- Q4 (cross-db)

