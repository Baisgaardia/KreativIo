const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();

app.use(cors()); // Tillader din i-bog at kalde denne proxy

app.get("/", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Mangler ?url= parameter");
  }
  try {
    const apiResponse = await fetch(targetUrl);
    const data = await apiResponse.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Kunne ikke hente data fra den angivne URL." });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Din proxy lytter på port " + listener.address().port);
});
