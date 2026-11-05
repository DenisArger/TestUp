/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4287217533")

  collection.fields.add(new TextField({
    "name": "respondent_name",
    "required": false
  }))
  collection.fields.add(new DateField({
    "name": "started_at",
    "required": false
  }))
  collection.fields.add(new DateField({
    "name": "finished_at",
    "required": false
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4287217533")
  collection.fields.removeByName("respondent_name")
  collection.fields.removeByName("started_at")
  collection.fields.removeByName("finished_at")
  return app.save(collection)
})
