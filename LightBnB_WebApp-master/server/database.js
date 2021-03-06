const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'caseytite',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(
      `SELECT * FROM users
  WHERE email = $1
  ;`,
      [email.toLowerCase()]
    )
    .then((result) => result.rows[0])
    .catch((err) => console.log('error message', err.message));
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(
      `SELECT * FROM users
    WHERE id = $1;`,
      [id]
    )
    .then((result) => result.rows[0])
    .catch((err) => console.log('error message', err.message));
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  let userName = user.name;
  let userEmail = user.email;
  let userPassword = user.password;

  return pool
    .query(
      `INSERT INTO users (name,email,password) 
  VALUES ($1,$2,$3)
  RETURNING * ;
  `,
      [userName, userEmail.toLowerCase(), userPassword]
    )
    .then((result) => result)
    .catch((err) => console.log('error message', err.message));
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(
      `SELECT * FROM reservations
    JOIN users ON users.id = guest_id
    JOIN properties ON property_id = properties.id
    WHERE users.id = $1
    ORDER BY start_date DESC
    LIMIT $2;`,
      [guest_id, limit]
    )
    .then((result) => result.rows)
    .catch((err) => console.log('error message', err.message));
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  console.log('options', options);

  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  //-------------------------------OF OWNER CHECKING THEIR LISTINGS

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE owner_id = $${queryParams.length}`;

    queryParams.push(limit);
    queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

    console.log(queryString, queryParams);

    return pool.query(queryString, queryParams).then((res) => res.rows);
  }

  //-----------------------------------------SELECTS CITY
  if (options.city) {
    queryParams.push(`%${options.city.slice(1)}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  //----------------------------------------SELECTS COST PER NIGHT
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `AND properties.cost_per_night >= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `AND properties.cost_per_night <= $${queryParams.length} `;
  }

  queryString += `GROUP BY properties.id
  `;

  //---------------------------------------SELECTS RATING
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING avg(rating) >= $${queryParams.length} `;
  }

  //----------------------------------------SELECTS LIMIT
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night 
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams).then((res) => res.rows);
};

exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  if (Object.values(property).includes('')) {
    return;
  }
  return pool
    .query(
      `INSERT INTO properties (title,description,number_of_bedrooms,number_of_bathrooms,parking_spaces,cost_per_night,thumbnail_photo_url,cover_photo_url,street,country,city,province,post_code,owner_id)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *;`,
      [
        property.title,
        property.description,
        property.number_of_bedrooms,
        property.number_of_bathrooms,
        property.parking_spaces,
        property.cost_per_night,
        property.thumbnail_photo_url,
        property.cover_photo_url,
        property.street,
        property.country,
        property.city,
        property.province,
        property.post_code,
        property.owner_id,
      ]
    )
    .then((result) => console.log(result.rows))
    .catch((err) => console.log('error', err.message));
};
exports.addProperty = addProperty;
