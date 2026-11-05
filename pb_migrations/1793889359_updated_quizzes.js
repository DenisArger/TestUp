/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_93315167")

  collection.fields.add(new NumberField({
    "name": "attempts_limit",
    "required": false
  }))
  collection.fields.add(new NumberField({
    "name": "time_limit",
    "required": false
  }))
  collection.fields.add(new BoolField({
    "name": "show_answers",
    "required": false
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_93315167")
  collection.fields.removeByName("attempts_limit")
  collection.fields.removeByName("time_limit")
  collection.fields.removeByName("show_answers")
  return app.save(collection)
})
