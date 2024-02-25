## USAGE

Application entry point is server.js.To start the development server,run:`npm start` || `npm run dev` || `nodemon server.js`. in your terminal. This will compile and run a local webserver on port 4000 that you can access in your browser at `http://localhost:6000`.

## node_modules

For installing node modules we can use the command `npm i --force`

## DB SETUP

- Create 3 database in mysql name
  - insp_development
  - insp_production
  - insp_test
- create .env file inside config folder (Refer .env.example to add variables)
- create config.json inside config folder (Refer .config.example.json)
- Do not push config.json , .env into remote repo (Add these files into .gitignore)

### Sequelize Commands:-

- The below will create one file in models and one file in migrations folder

```bash
npx sequelize-cli model:generate --name User --attributes firstName:string,lastName:string,email:string
```

- The below will create one file in migration only not model (Good if we want to change db schema)
- Please note: after adding new columns or any changes to schema make sure it is added or removed from main model file

```bash
npx sequelize-cli migration:generate --name modify-users-table

```

- Undo a specific migration file by specifing name of the migrationfile.js

```bash
npx sequelize-cli db:migrate:undo --name 20180704124934-create-branch.js
```

### Migration files info :-

- To add automatice dateTime field in createdAt field add a defaultValue

```bash
  defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
```

- To add automatice dateTime field in updatedAt field add a defaultValue

```bash
  defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
```
