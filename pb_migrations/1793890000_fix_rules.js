/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  for (const name of ["quizzes","questions","attempts"]) {
    const c = app.findCollectionByNameOrId(name);
    c.listRule = "";
    c.viewRule = "";
    c.createRule = "";
    c.updateRule = "";
    c.deleteRule = "";
    app.save(c);
  }
  return;
}, (app) => {})
