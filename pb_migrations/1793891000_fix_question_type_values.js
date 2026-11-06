/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4009210445");
  // Fix trailing whitespace in select values ("single  " -> "single")
  const field = collection.fields.find(f => f.name === "type");
  if (field && field.type === "select" && Array.isArray(field.values)) {
    const before = field.values.slice();
    field.values = field.values.map(v => v.trim());
    if (JSON.stringify(before) !== JSON.stringify(field.values)) {
      console.log("[migration] Fixed question.type values:", JSON.stringify(before), "->", JSON.stringify(field.values));
    }
  }
  return app.save(collection);
}, (app) => {})