/*,
CREATE DATABASE cargo_db;
USE cargo_db;

CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(255)
);

CREATE TABLE sections (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  location VARCHAR(255)
);

CREATE TABLE deliverymen (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(255),
  dailyRate DECIMAL(10,2),
  workedDayMontly INT,

  workPlace INT,
  FOREIGN KEY (workPlace) REFERENCES sections(id)
);

CREATE TABLE carriers (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(255),
  dailyRate DECIMAL(10,2),
  workedDayMontly INT,

  workPlace INT,
  FOREIGN KEY (workPlace) REFERENCES sections(id),

  whereToGo INT,
  FOREIGN KEY (whereToGo) REFERENCES sections(id) -- was incorrectly referencing workPlace again
);

CREATE TABLE cargos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  volume DECIMAL(10,2),
  mass DECIMAL(10,2),

  customerName VARCHAR(255),
  customerPhone VARCHAR(255),
  customerID INT,
  FOREIGN KEY (customerID) REFERENCES customers(id),

  receiverName VARCHAR(255),
  receiverPhone VARCHAR(255),

  address VARCHAR(512),

  ETA VARCHAR(255),

  fromWhere INT,
  FOREIGN KEY (fromWhere) REFERENCES sections(id),

  toWhere INT,
  FOREIGN KEY (toWhere) REFERENCES sections(id),  -- fixed copy-paste error

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  rendezvous VARCHAR(255),

  status ENUM('pending', 'transit', 'deliver', 'delivered') DEFAULT 'pending',
  
  deliverymanId INT,
  FOREIGN KEY (deliverymanId) REFERENCES deliverymen(id),

  carrierID INT,
  FOREIGN KEY (carrierID) REFERENCES carriers(id)
);


*/

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Serve HTML file
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'abgoo',  // <-- Change to your MySQL password
  database: 'cargo_db'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});





app.post('/add-customer', 
  (req, res) => 
  {
  const {id, name, phone } = req.body;

  const sql = 'INSERT INTO customers (id, name, phone) VALUES (?,?,?)';
  db.query(sql, [id, name, phone],       
    (err, result) => 
    {
    if (err) throw err;
    res.send('<h3>Cargo added successfully!</h3><a href="/">Go back</a>');
  });
});


app.post('/add-section', 
  (req, res) => 
  {
  const {id, name, location } = req.body;

  const sql = 'INSERT INTO sections (id, name, location) VALUES (?,?,?)';
  db.query(sql, [id, name, location],       
    (err, result) => 
    {
    if (err) throw err;
    res.send('<h3>Cargo added successfully!</h3><a href="/">Go back</a>');
  });
});

// Show all sections
app.get('/api/sections', (req, res) => {
  const sql = 'SELECT * FROM sections';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

//show filtered sections
app.get('/api/sections/filtered', (req, res) => {
  let sql = 'SELECT * FROM sections';
  const params = [];

  if (req.query.id) {
    sql += ' WHERE id = ?';
    params.push( req.query.id);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

app.post('/add-deliveryman', 
  (req, res) => 
  {
  const {id, name, phone, dailyRate, workedDayMontly, workPlace } = req.body;

  const sql = 'INSERT INTO deliverymen (id, name, phone, dailyRate, workedDayMontly, workPlace) VALUES (?,?,?,?,?,?)';
  db.query(sql, [id, name, phone, dailyRate, workedDayMontly, workPlace],       
    (err, result) => 
    {
    if (err) throw err;
    res.send('<h3>Cargo added successfully!</h3><a href="/">Go back</a>');
  });
});


app.post('/add-carrier', 
  (req, res) => 
  {
  const {id, name, phone, dailyRate, workedDayMontly, workPlace, whereToGo} = req.body;

  const sql = 'INSERT INTO carriers (id, name, phone, dailyRate, workedDayMontly, workPlace, whereToGo) VALUES (?,?,?,?,?,?,?)';
  db.query(sql, [id, name, phone, dailyRate, workedDayMontly, workPlace, whereToGo],       
    (err, result) => 
    {
    if (err) throw err;
    res.send('<h3>Cargo added successfully!</h3><a href="/">Go back</a>');
  });
});

// Cargo adding
app.post('/add-cargo', 
  async (req, res) => 
  {
  const 
    { 
    customerName,
    customerID,
    customerPhone,

    receiverName,
    receiverPhone,

    mass,
    volume,

    customerAddress1,

    receiverAddress1,
    receiverAddress0
    } = req.body;

    // Calculate ETA (example: 3 days from now)
    const ETA = new Date();
    ETA.setDate(ETA.getDate() + 3);

    // Step 1: Get deliverymanId
    const getDeliverymanId = () => {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT id FROM deliverymen WHERE workPlace = ? LIMIT 1',
          [receiverAddress1],
          (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return reject(new Error('No available deliveryman'));
            resolve(results[0].id);
          }
        );
      });
    };

    // Step 2: Get carrierID (example: based on destination)
    const getCarrierId = () => {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT id FROM carriers WHERE workPlace = ? AND whereToGo = ? LIMIT 1',
          [customerAddress1, receiverAddress1],
          (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return reject(new Error('No carrier found for destination'));
            resolve(results[0].id);
          }
        );
      });
    };
    try
    {
      const deliverymanId = await getDeliverymanId();
      const carrierID = await getCarrierId();

      const sql = `INSERT INTO cargos 
      (volume, mass, customerName, customerPhone, customerID, 
      receiverName, receiverPhone, address, ETA, fromWhere, toWhere, 
      deliverymanId, carrierID) 
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;

      //const sql = 'INSERT INTO cargos (volume, mass, customerName, customerPhone, customerID, receiverName, receiverPhone, address, ETA, fromWhere, toWhere, deliverymanId, carrierID) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
      db.query(sql, [
        volume, 
        mass, 
        customerName, 
        customerPhone, 
        customerID, 
        receiverName,
        receiverPhone, 
        receiverAddress0,  //address
        ETA,               //must be calculated 
        customerAddress1,  //from
        receiverAddress1,  //to
        //rendezvous, 
        deliverymanId,    //deliverymanId
        carrierID           //carrierID
        ],       
        (err, result) => 
        {
        if (err) throw err;
        res.send('<h3>Cargo added successfully!</h3><a href="/">Go back</a>');
      });
    }
    catch (error) {
      res.status(500).send('❌ Error: ' + error.message);
    }
});

//show filtered sections
app.get('/api/cargos/filtered', (req, res) => {
  let sql = 'SELECT * FROM cargos';
  const params = [];

  if (req.query.id) {
    sql += ' WHERE id = ?';
    params.push( req.query.id);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

