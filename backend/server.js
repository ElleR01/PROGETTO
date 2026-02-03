const express = require("express");
const neo4j = require("neo4j-driver");
const { MongoClient } = require("mongodb");
const cors = require("cors");


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(cors());

/* ======================
   CONNESSIONI DB
====================== */

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password123") // <-- cambia password se serve
);

const mongoClient = new MongoClient("mongodb://localhost:27017");
let mongoDb;

(async () => {
  await mongoClient.connect();
  mongoDb = mongoClient.db("ldbc");
  console.log("✅ Mongo connected");
})();

/* ======================
   Q1 — Feed amici (cross-db)
====================== */

app.get("/api/q1/feed", async (req, res) => {
  const userId = Number(req.query.userId);
  const limit = Number(req.query.limit || 20);

  const session = driver.session();

  try {
    const neo = await session.run(`
      MATCH (:Person {id:$id})-[:KNOWS]->(f)
      RETURN collect(f.id) AS ids
    `, { id: userId });

    const friendIds = neo.records[0].get("ids").map(x => x.toNumber());

    const posts = await mongoDb.collection("postCreators")
      .aggregate([
        { $match: { "Person.id": { $in: friendIds } } },
        {
          $lookup: {
            from: "posts",
            localField: "Post.id",
            foreignField: "id",
            as: "post"
          }
        },
        { $unwind: "$post" },
        { $sort: { "post.creationDate": -1 } },
        { $limit: limit },
        { $project: { _id: 0, authorId: "$Person.id", post: "$post" } }
      ])
      .toArray();

    res.json(posts);

  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await session.close();
  }
});

/* ======================
   Q2 — Profilo utente (Neo4j)
====================== */

app.get("/api/q2/profile", async (req, res) => {
  const userId = Number(req.query.userId);

  const session = driver.session();

  try {
    const r = await session.run(`
      MATCH (p:Person {id:$id})
      OPTIONAL MATCH (p)-[:KNOWS]-(f)
      RETURN p.firstName AS firstName,
             p.lastName AS lastName,
             count(DISTINCT f) AS friends
    `, { id: userId });

    res.json(r.records[0].toObject());

  } finally {
    await session.close();
  }
});

/* ======================
   Q3 — Top influencer (Neo4j analitica)
====================== */

app.get("/api/q3/influencers", async (req, res) => {
  const topN = parseInt(req.query.topN ?? "10", 10);

  if (!Number.isInteger(topN) || topN < 1) {
    return res.status(400).json({ error: "topN must be a positive integer" });
  }

  const session = driver.session();
  try {
    const r = await session.run(
      `
      MATCH (p:Person)-[:KNOWS]-(f:Person)
      RETURN p.id AS id, p.firstName AS firstName, p.lastName AS lastName,
             count(DISTINCT f) AS friends
      ORDER BY friends DESC
      LIMIT $n
      `,
      { n: neo4j.int(topN) }   // <-- importantissimo: Neo4j Integer
    );

    res.json(r.records.map(x => x.toObject()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await session.close();
  }
});

/* ======================
   Q4 — Top città per attività (cross-db)
====================== */

app.get("/api/q4/city-activity", async (req, res) => {
  const topN = Number(req.query.topN || 10);

  const session = driver.session();

  try {
    // attività per persona (Mongo)
    const activity = new Map();

    const postAgg = await mongoDb.collection("postCreators")
      .aggregate([{ $group: { _id: "$Person.id", c: { $sum: 1 } } }]).toArray();

    const commentAgg = await mongoDb.collection("commentCreators")
      .aggregate([{ $group: { _id: "$Person.id", c: { $sum: 1 } } }]).toArray();

    [...postAgg, ...commentAgg].forEach(x =>
      activity.set(String(x._id), (activity.get(String(x._id)) || 0) + x.c)
    );

    // città da Neo4j
    const r = await session.run(`
      MATCH (p)-[:IS_LOCATED_IN]->(pl:Place {type:'city'})
      RETURN pl.name AS city, collect(p.id) AS residents
    `);

    const results = r.records.map(rec => {
      const residents = rec.get("residents").map(x => x.toString());

      const total = residents.reduce((s, id) =>
        s + (activity.get(id) || 0), 0);

      return { city: rec.get("city"), activity: total };
    });

    results.sort((a, b) => b.activity - a.activity);

    res.json(results.slice(0, topN));

  } finally {
    await session.close();
  }
});

/* ====================== */

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
