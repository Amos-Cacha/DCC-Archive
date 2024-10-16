const knex = require("knex");
const async = require("async");
const [dbInit,] = require("../initDatabase");
const { dbInfo } = require("./dbInfo");
require("dotenv").config();

const tables = dbInfo.tables;
const tableNames = Object.values(tables);

let knexClient = {};

const fields = {};
for (const table of tableNames) {
  const field = dbInfo.fields[table];
  fields[table] = Object.values(field);
}

const database = {
  /**
   * This function initializes the database given the path of the file.
   * @param {string} file the path of the file to be opened
   */
  initDB: async function (file) {
    //dbInit(file);
    knexClient = knex({
      client: "sqlite3",
      connection: {
        filename: file,
      },
      useNullAsDefault: true,
    });

    knexClient.raw("PRAGMA foreign_keys = ON");
  },

  /**
   * This function inserts the data into a specified table in the database and passes the result to the
   * callback function
   * @param {string} table - the table where the data will be added
   * @param {object} data  - the object containing the values paired to their respective column name / can also be an array of objects
   * @param {function} callback - the function to be executed after inserting the data
   */
  insert: function (table, data, callback = null) {
    // if table is not in database
    if (data === null || (Array.isArray(data) && data.length === 0)) {
      const result = [];
      callback(result);
    } else {
      if (!tableNames.includes(table)) {
        const success = false;
        callback(success);
      } else {
        if (Array.isArray(data)) {
          data.forEach((record) => {
            for (const key in record) {
              if (
                fields[table].includes(key) && // if the key is a valid field
                (data[key] === null || data[key] === undefined)
              ) {
                // if the value is valid
                delete data[key];
              }
            }
          });
        } else {
          for (const key in data) {
            if (
              fields[table].includes(key) && // if the key is a valid field
              (data[key] === null || data[key] === undefined)
            ) {
              // if the value is valid
              delete data[key];
            }
          }
        }

        knexClient(table)
          .insert(data) // insert data
          .then(function (result) {
            if (callback !== null) {
              callback(result); // if there is a callback function return id of inserted row
            }
          })
          .catch(function (err) {
            console.log(err);
            if (callback !== null) {
              const flag = false;
              callback(flag); // pass false to the callback function where an error occurred
            }
          });
      }
    }
  },

  /**
   * This method finds all the records in a table given some conditions
   * @param {String} table - the name of the table
   * @param {Array<Condition>} conditions - an array of objects containing the WHERE conditions paired to their respective column name
   * @param {Array<Object>} join - an array of objects containing the join conditions
   * @param {String} projection - the columns to be retrieved
   * @param {function} callback - the callback function
   * @param {Array<String>} - an array of raw select statements
   */
  find: function (
    table,
    conditions = null,
    join = null,
    projection = "*",
    callback,
    rawSelect = []
  ) {
    const tableClient = knexClient(table);

    if (join !== null && join !== undefined) {
      // console.log("JOINING!");
      if (!Array.isArray(join)) {
        join = [join];
      }

      for (const joinTable of join) {
        switch (joinTable.type) {
          case "innerJoin":
            tableClient.innerJoin(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
            break;
          case "leftJoin":
            tableClient.leftJoin(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
            break;
          case "leftOuterJoin":
            tableClient.leftOuterJoin(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
            break;
          case "rightJoin":
            tableClient.rightJoin(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
            break;
          case "rightOuterJoin":
            tableClient.rightOuterJoin(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
            break;
          case "fullOuterJoin":
            tableClient.fullOuterJoin(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
            break;
          case "crossJoin":
            tableClient.crossJoin(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
            break;
          case "join":
          default:
            tableClient.join(
              joinTable.tableName,
              joinTable.sourceCol,
              joinTable.destCol
            );
        }
      }
    }

    tableClient.select(projection);

    for (const select of rawSelect) {
      tableClient.select(knexClient.raw(select));
    }

    tableClient
      .where(function (builder) {
        if (conditions !== null && conditions !== undefined) {
          if (!Array.isArray(conditions)) {
            conditions = [conditions];
          }
          async.each(conditions, function (condition, eCallback) {
            switch (condition.type) {
              case "where":
                if (condition.conditionType === "object") {
                  builder.where(condition.condition);
                } else if (condition.conditionType === "keyValue") {
                  builder.where(
                    condition.condition.key,
                    condition.condition.operator,
                    condition.condition.value
                  );
                }
                break;
              case "orWhere":
                if (condition.conditionType === "object") {
                  builder.orWhere(condition.condition);
                } else if (condition.conditionType === "keyValue") {
                  builder.orWhere(
                    condition.condition.key,
                    condition.condition.operator,
                    condition.condition.value
                  );
                }
                break;
              case "whereNot":
                if (condition.conditionType === "object") {
                  builder.whereNot(condition.condition);
                } else if (condition.conditionType === "keyValue") {
                  builder.whereNot(
                    condition.condition.key,
                    condition.condition.operator,
                    condition.condition.value
                  );
                }
                break;
              case "whereIn":
                if (condition.conditionType === "array") {
                  builder.whereIn(condition.field, condition.data);
                }
                break;
              case "whereNotIn":
                if (condition.conditionType === "array") {
                  builder.whereNotIn(condition.field, condition.data);
                }
                break;
              case "whereNull":
                if (condition.conditionType === "field") {
                  builder.whereNull(condition.field);
                }
                break;
              case "whereNotNull":
                if (condition.conditionType === "field") {
                  builder.whereNotNull(condition.field);
                }
                break;
              case "whereBetween":
                if (condition.conditionType === "range") {
                  builder.whereBetween(condition.condition.field, [
                    condition.condition.lowerBound,
                    condition.condition.upperBound,
                  ]);
                }
                break;
              case "whereNotBetween":
                if (condition.conditionType === "range") {
                  builder.whereNotBetween(condition.condition.field, [
                    condition.condition.lowerBound,
                    condition.condition.upperBound,
                  ]);
                }
                break;
              case "whereRaw":
                if (condition.conditionType === "query") {
                  builder.whereRaw(condition.query, condition.bindings);
                }
                break;
              default:
                throw console.error("Unknown query");
            }
          });
        }
      })
      .then(function (result) {
        callback(result);
      })
      .catch((err) => {
        console.log(err);
        const flag = false;
        callback(flag);
      });
  },

  /**
   * This method gets all the records of a table
   * @param {String} table this is the name of the table
   * @param {String} projection the columns/fields to be retrieved
   * @param {function} callback this is the callback funciton to be called after getting the result
   */
  findAll: function (table, projection, callback) {
    knexClient(table)
      .select(projection)
      .then(function (result) {
        callback(result);
      })
      .catch((err) => {
        console.log(err);
        const flag = false;
        callback(flag);
      });
  },

  /*
    This table is a constant object containing the constant strings
    of the tables
  */
  tables: tables,

  /**
   * This function creates a new table specified by the param object newTable and
   * passes a callback function after execution
   * @param {string} newTable - the table name to be created
   * @param {array} columns - the array of strings containing column names
   *                      e.g. columns = ['name', 'age', 'city']
   * @param {object} types - the object containing the data types paired to the columns array
   *                      e.g. types = {name: 'string', age: 'integer', city: 'string'}
   */
  createTable: function (newTable, columns, types, callback = null) {
    knexClient.schema
      .createTable(newTable, function (table) {
        table.increments();
        // traverses to columns array
        for (let i = 0; i < columns.length; i++) {
          // determines the data type using a switch
          switch (types[columns[i]]) {
            // each case corresponds to what data type function to use
            case "string":
              table.string(columns[i]);
              break;
            case "integer":
              table.integer(columns[i]);
              break;
            case "date":
              table.date(columns[i]);
              break;
            case "boolean":
              table.boolean(columns[i]);
              break;
            case "float":
            case "decimal":
              table.decimal(columns[i]);
              break;
          }
        }
        table.timestamps();
      })
      .then(function (result) {
        tableNames.push(newTable);
        fields[tableNames] = [];

        for (const col in columns) {
          fields[tableNames].push(col);
        }

        if (callback !== null) {
          // if there is a callback function return id of inserted row
          callback(result);
        }
      })
      .catch(function (err) {
        console.log(err);
        if (callback !== null) {
          const flag = false;
          callback(flag); // pass false to the callback function where an error occurred
        }
      });
  },

  /**
   * This function updates a data into a specified table based on the object data and
   * condition, afterwards it passes the callback function
   * @param {string} table - refers to the table name where the data will be updated onto a row
   * @param {object} data - the object containing the values paired to their respective column name
   * @param {Array<Conditions>} condition - an array of objects containing the WHERE conditions paired to their respective column name
   */
  update: function (table, data, conditions, callback = null) {
    if (data && Object.keys(data).length === 0) {
      if (callback) {
        const result = 0;
        callback(result);
      }
    } else {
      knexClient(table)
        .where(function (builder) {
          if (conditions !== null && conditions !== undefined) {
            if (!Array.isArray(conditions)) {
              conditions = [conditions];
            }
            async.each(conditions, function (condition, callback) {
              switch (condition.type) {
                case "where":
                  if (condition.conditionType === "object") {
                    builder.where(condition.condition);
                  } else if (condition.conditionType === "keyValue") {
                    builder.where(
                      condition.condition.key,
                      condition.condition.operator,
                      condition.condition.value
                    );
                  }
                  break;
                case "orWhere":
                  if (condition.conditionType === "object") {
                    builder.orWhere(condition.condition);
                  } else if (condition.conditionType === "keyValue") {
                    builder.orWhere(
                      condition.condition.key,
                      condition.condition.operator,
                      condition.condition.value
                    );
                  }
                  break;
                case "whereNot":
                  if (condition.conditionType === "object") {
                    builder.whereNot(condition.condition);
                  } else if (condition.conditionType === "keyValue") {
                    builder.whereNot(
                      condition.condition.key,
                      condition.condition.operator,
                      condition.condition.value
                    );
                  }
                  break;
                case "whereIn":
                  if (condition.conditionType === "array") {
                    builder.whereIn(condition.field, condition.data);
                  }
                  break;
                case "whereNotIn":
                  if (condition.conditionType === "array") {
                    builder.whereNotIn(condition.field, condition.data);
                  }
                  break;
                case "whereNull":
                  if (condition.conditionType === "field") {
                    builder.whereNull(condition.field);
                  }
                  break;
                case "whereNotNull":
                  if (condition.conditionType === "field") {
                    builder.whereNotNull(condition.field);
                  }
                  break;
                case "whereBetween":
                  if (condition.conditionType === "range") {
                    builder.whereBetween(condition.condition.field, [
                      condition.condition.lowerBound,
                      condition.condition.upperBound,
                    ]);
                  }
                  break;
                case "whereNotBetween":
                  if (condition.conditionType === "range") {
                    builder.whereNotBetween(condition.condition.field, [
                      condition.condition.lowerBound,
                      condition.condition.upperBound,
                    ]);
                  }
                  break;
                case "whereRaw":
                  if (condition.conditionType === "query") {
                    builder.whereRaw(condition.query, condition.bindings);
                  }
                  break;
                default:
                  throw console.error("Unknown query");
              }
            });
          }
        })
        .update(data)
        .then(function (result) {
          if (callback !== null) {
            // if there is a callback function return id of inserted row
            callback(result);
          }
        })
        .catch(function (err) {
          console.log(err);
          if (callback !== null) {
            const flag = false;
            callback(flag); // pass false to the callback function where an error occurred
          }
        });
    }
  },

  /**
   * This function deletes a row in a table specified by the provided conditions and passes
   * a callback function
   * @param {string} table - refers to the table name where the row will be deleted
   * @param {Array<Condition>} conditions - an array of objects containing the WHERE conditions paired to their respective column name
   */
  delete: function (table, conditions, callback = null) {
    knexClient(table)
      .where(function (builder) {
        if (conditions !== null && conditions !== undefined) {
          if (!Array.isArray(conditions)) {
            conditions = [conditions];
          }
          async.each(conditions, function (condition, callback) {
            switch (condition.type) {
              case "where":
                if (condition.conditionType === "object") {
                  builder.where(condition.condition);
                } else if (condition.conditionType === "keyValue") {
                  builder.where(
                    condition.condition.key,
                    condition.condition.operator,
                    condition.condition.value
                  );
                }
                break;
              case "orWhere":
                if (condition.conditionType === "object") {
                  builder.orWhere(condition.condition);
                } else if (condition.conditionType === "keyValue") {
                  builder.orWhere(
                    condition.condition.key,
                    condition.condition.operator,
                    condition.condition.value
                  );
                }
                break;
              case "whereNot":
                if (condition.conditionType === "object") {
                  builder.whereNot(condition.condition);
                } else if (condition.conditionType === "keyValue") {
                  builder.whereNot(
                    condition.condition.key,
                    condition.condition.operator,
                    condition.condition.value
                  );
                }
                break;
              case "whereIn":
                if (condition.conditionType === "array") {
                  builder.whereIn(condition.field, condition.data);
                }
                break;
              case "whereNotIn":
                if (condition.conditionType === "array") {
                  builder.whereNotIn(condition.field, condition.data);
                }
                break;
              case "whereNull":
                if (condition.conditionType === "field") {
                  builder.whereNull(condition.field);
                }
                break;
              case "whereNotNull":
                if (condition.conditionType === "field") {
                  builder.whereNotNull(condition.field);
                }
                break;
              case "whereBetween":
                if (condition.conditionType === "range") {
                  builder.whereBetween(condition.condition.field, [
                    condition.condition.lowerBound,
                    condition.condition.upperBound,
                  ]);
                }
                break;
              case "whereNotBetween":
                if (condition.conditionType === "range") {
                  builder.whereNotBetween(condition.condition.field, [
                    condition.condition.lowerBound,
                    condition.condition.upperBound,
                  ]);
                }
                break;
              case "whereRaw":
                if (condition.conditionType === "query") {
                  builder.whereRaw(condition.query, condition.bindings);
                }
                break;
              default:
                throw console.error("Unknown query");
            }
          });
        }
      })
      .del()
      .then(function (result) {
        if (callback !== null) {
          // if there is a callback function return id of inserted row
          callback(result);
        }
      })
      .catch(function (err) {
        console.log(err);
        if (callback !== null) {
          const flag = false;
          callback(flag); // pass false to the callback function where an error occurred
        }
      });
  },
};

module.exports = database;
