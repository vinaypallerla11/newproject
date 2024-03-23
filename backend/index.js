const express = require("express");
const cors = require('cors');
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "user.db");
const app = express();

app.use(express.json());
app.use(cors());


let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(5000, () => {
      console.log("Server Running at http://localhost:5000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();


const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        console.log(request.username);
        next();
      }
    });
  }
};

// GET API

app.get("/employee/", async (request, response) => {
  const getEmpQuery = `
   SELECT
    *
   FROM
   registers;`;
  const EmployeeArray = await db.all(getEmpQuery);
  response.send(EmployeeArray);
});

// POST API

app.post("/employee/", async(request, response) =>{
    const {username, password, email, gender, location} = request.body

    const empPostQuery = `
      INSERT INTO registers(username, password, email, gender, location)
      VALUES('${username}',  '${password}', '${email}', '${gender}', '${location}');`;
    const Array = await db.run(empPostQuery)
    response.send("Employee data add sucessfully")
})

// UPDATE API

app.put("/employee/", async (request, response) => {
    const { username, password, email, gender, location } = request.body;

    const empPutQuery = `
        UPDATE registers 
        SET 
            username = '${username}', 
            password = '${password}', 
            email = '${email}', 
            gender = '${gender}', 
            location = '${location}'
        WHERE username = 'manasa';`;
    
    await db.run(empPutQuery);

    response.send("Employee data updated successfully");
});

// DELETE API

app.delete("/employee/:username", async (request, response) => {
    const { username } = request.params;

    const deleteQuery = `
        DELETE FROM registers
        WHERE username = '${username}';`;
    
    await db.run(deleteQuery);

    response.send(`User ${username} deleted successfully`);
});


// user register API

app.post("/registers/", async (request, response) => {
  const { username, password, email, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM registers WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        registers (username, password, email, gender, location) 
      VALUES 
        (
          '${username}', 
          '${hashedPassword}', 
          '${email}',
          '${gender}',
          '${location}'
        )`;
    await db.run(createUserQuery);
    response.send(`User created successfully`);
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM registers WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});