const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;

const housesFile = path.join(__dirname, "data", "houses.json");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

// CRUD API
app.get("http://localhost:3000/houses", (req, res) => res.json(JSON.parse(fs.readFileSync(housesFile))));
app.get("http://localhost:3000/houses/:id", (req, res) => {
  const houses = JSON.parse(fs.readFileSync(housesFile)).houses;
  const house = houses.find(h => h.id === req.params.id);
  house ? res.json(house) : res.status(404).json({ error: "House not found" });
});
app.post("http://localhost:3000/houses", (req, res) => {
  const houses = JSON.parse(fs.readFileSync(housesFile));
  const newHouse = { ...req.body, id: Date.now().toString(), status: "available" };
  houses.houses.push(newHouse);
  fs.writeFileSync(housesFile, JSON.stringify(houses, null, 2));
  res.json(newHouse);
});
app.put("http://localhost:3000/houses/:id", (req, res) => {
  const houses = JSON.parse(fs.readFileSync(housesFile));
  const index = houses.houses.findIndex(h => h.id === req.params.id);
  if (index !== -1) {
    houses.houses[index] = { ...houses.houses[index], ...req.body };
    fs.writeFileSync(housesFile, JSON.stringify(houses, null, 2));
    res.json(houses.houses[index]);
  } else res.status(404).json({ error: "House not found" });
});
app.delete("http://localhost:3000/houses/:id", (req, res) => {
  const houses = JSON.parse(fs.readFileSync(housesFile));
  const index = houses.houses.findIndex(h => h.id === req.params.id);
  if (index !== -1) {
    const removed = houses.houses.splice(index, 1);
    fs.writeFileSync(housesFile, JSON.stringify(houses, null, 2));
    res.json(removed[0]);
  } else res.status(404).json({ error: "House not found" });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
