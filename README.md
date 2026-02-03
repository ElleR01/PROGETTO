# 👨‍💻 Autore
Lorenzo Rosales Vasquez, Anno accademico 2024/2025, Progetto universitario MAADB

Progetto per **Modelli e Architetture Avanzati di Basi di Dati**

Implementazione di un sistema **multi-database** usando:

- Neo4j → grafo (relazioni sociali)
- MongoDB → documenti (post/commenti)
- Node.js + Express → API web (prototipo dimostrativo)


---

# ⚙️ Requisiti

Installare:

- Docker + Docker Compose
- Node.js (npm)

---

# 🚀 Avvio infrastruttura

```bash```
cd infra
docker compose up -d

---
# Controllo
```bash```
docker ps

````Devono essere attivi:```
infra-neo4j-1
infra-mongo-1
infra-mongo-express-1

# 📥 Import Dataset
Mettere tutti i file dentro: infra/neo4j_import/

```File per Neo4j (grafo)```
person_0_0.csv
person_knows_person_0_0.csv
place_0_0.csv
person_isLocatedIn_place_0_0.csv

```File per MongoDB (documenti)```
post_0_0.csv
comment_0_0.csv
post_hasCreator_person_0_0.csv
comment_hasCreator_person_0_0.csv

```MongoDB non supporta | come separatore CSV.```
Aprire questi file con VS Code e sostituire: |  →  ,

# 🔵 Import Neo4j

Aprire browser: http://localhost:7474
Login: neo4j / password123

``` 1️⃣ Constraints ```
CREATE CONSTRAINT person_id IF NOT EXISTS
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT place_id IF NOT EXISTS
FOR (pl:Place) REQUIRE pl.id IS UNIQUE;

```2️⃣ Import Person```
:auto
LOAD CSV WITH HEADERS
FROM 'file:///person_0_0.csv'
AS row FIELDTERMINATOR '|'
CREATE (:Person {
  id: toInteger(row.id),
  firstName: row.firstName,
  lastName: row.lastName,
  gender: row.gender,
  birthday: row.birthday,
  creationDate: row.creationDate
});

```3️⃣ Import KNOWS```
:auto
LOAD CSV WITH HEADERS
FROM 'file:///person_knows_person_0_0.csv'
AS row FIELDTERMINATOR '|'
MATCH (p1:Person {id: toInteger(row.`Person.id`)})
MATCH (p2:Person {id: toInteger(row.`Person.id.1`)})
MERGE (p1)-[:KNOWS]->(p2);

```4️⃣ Import Place``` 
:auto
LOAD CSV WITH HEADERS
FROM 'file:///place_0_0.csv'
AS row FIELDTERMINATOR '|'
CREATE (:Place {
  id: toInteger(row.id),
  name: row.name,
  type: row.type
});

```5️⃣ Person → Place```
:auto
LOAD CSV WITH HEADERS
FROM 'file:///person_isLocatedIn_place_0_0.csv'
AS row FIELDTERMINATOR '|'
MATCH (p:Person {id: toInteger(row.`Person.id`)})
MATCH (pl:Place {id: toInteger(row.`Place.id`)})
MERGE (p)-[:IS_LOCATED_IN]->(pl);

# 🔵 Import MongoDB

```Eseguire nel terminale:```

docker exec -it infra-mongo-1 mongoimport --db ldbc --collection posts --type csv --headerline --file /import/post_0_0.csv

docker exec -it infra-mongo-1 mongoimport --db ldbc --collection comments --type csv --headerline --file /import/comment_0_0.csv

docker exec -it infra-mongo-1 mongoimport --db ldbc --collection postCreators --type csv --headerline --file /import/post_hasCreator_person_0_0.csv

docker exec -it infra-mongo-1 mongoimport --db ldbc --collection commentCreators --type csv --headerline --file /import/comment_hasCreator_person_0_0.csv

# 🔧 Indici (performance)

```Aprire:``` 
docker exec -it infra-mongo-1 mongosh
```Poi:```
use ldbc
db.postCreators.createIndex({"Person.id":1})
db.commentCreators.createIndex({"Person.id":1})
db.posts.createIndex({id:1})
db.comments.createIndex({id:1})

# ▶️ Avvio Backend
cd backend
npm install
node server.js

# 🔍 Test API 
``` Query 1 — Feed amici (Lookup, Cross-DB)``` 
http://localhost:3000/api/q1/feed?userId=933&limit=20

``` Query 2 — Profilo utente (Lookup, Neo4j)``` 
http://localhost:3000/api/q2/profile?userId=933

``` Query 3 — Top influencer (Analitica, Neo4j)``` 
http://localhost:3000/api/q3/influencers?topN=10

``` Query 4 — Top città per attività (Analitica, Cross-DB)``` 
http://localhost:3000/api/q4/city-activity?topN=10

# 📊 Sito demo
http://localhost:3000
