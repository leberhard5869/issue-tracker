"use strict";

var expect = require("chai").expect;
var mongo = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID; // why needed?
var bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const shortid = require("shortid");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.set("useFindAndModify", false);

module.exports = function(app) {
  mongoose.connect(
    process.env.DATABASE,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    (err, client) => {
      if (err) {
        console.log("Database error: " + err);
      } else {
        console.log("Successful database connection");
      }
    }
  );

  // Set up schema
  const Schema = mongoose.Schema;
  const issuesSchema = new Schema({
    issue_title: { type: String, required: true },
    issue_text: { type: String, required: true },
    created_by: { type: String, required: true },
    assigned_to: { type: String },
    status_text: { type: String },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
    open: { type: Boolean, default: true },
    _id: { type: String, default: shortid.generate }
  });

  app
    .route("/api/issues/:project")

    // Create new issue
    .post(function(req, res, next) {
      var createAndSaveIssue = function(project) {
        const Model = mongoose.model(project, issuesSchema);
        var newIssue = new Model({
          issue_title: req.body.issue_title,
          issue_text: req.body.issue_text,
          created_by: req.body.created_by,
          assigned_to: req.body.assigned_to,
          status_text: req.body.status_text
        });
        newIssue.save(function(err, data) {
          if (err) return res.send("POST error");
          res.json({
            issue_title: data.issue_title,
            issue_text: data.issue_text,
            created_by: data.created_by,
            assigned_to: data.assigned_to,
            status_text: data.status_text,
            created_on: data.created_on,
            updated_on: data.updated_on,
            open: data.open,
            _id: data._id
          });
        });
      };
      createAndSaveIssue(req.params.project);
    })

    // Update existing issue
    .put(function(req, res) {
      var updateIssue = function(
        project,
        id,
        title,
        text,
        created,
        assigned,
        status,
        open
      ) {
        const Model = mongoose.model(project, issuesSchema);
        if (title === "") title = undefined;
        if (text === "") text = undefined;
        if (created === "") created = undefined;
        if (assigned === "") assigned = undefined;
        if (status === "") status = undefined;
        Model.findOneAndUpdate(
          { _id: id },
          {
            issue_title: title,
            issue_text: text,
            created_by: created,
            assigned_to: assigned,
            status_text: status,
            updated_on: new Date(),
            open: open
          },
          { omitUndefined: true, new: true },
          function(err, data) {
            if (err) {
              return res.send("could not update " + req.body._id);
            } else if (
              title == undefined &&
              text == undefined &&
              created == undefined &&
              assigned == undefined &&
              status == undefined &&
              open == undefined
            ) {
              res.send("no updated field sent");
            } else {
              res.send("successfully updated");
            }
          }
        );
      };
      updateIssue(
        req.params.project,
        req.body._id,
        req.body.issue_title,
        req.body.issue_text,
        req.body.created_by,
        req.body.assigned_to,
        req.body.status_text,
        req.body.open
      );
    })

    // Delete existing issue
    .delete(function(req, res) {
      var deleteIssue = function(project, id) {
        const Model = mongoose.model(project, issuesSchema);
        Model.findByIdAndRemove(id, function(err, data) {
          console.log(data);
          if (err) {
            console.log(err);
            return res.send("could not delete " + req.body._id);
          } else {
            data ? res.send("deleted " + data._id) : res.send("_id error");
          }
        });
      };
      deleteIssue(req.params.project, req.body._id);
    })

    .get(function(req, res) {
      var listIssues = function(
        project,
        id,
        title,
        text,
        createdBy,
        assignedTo,
        status,
        createdOn,
        updatedOn,
        open
      ) {
        const Model = mongoose.model(project, issuesSchema);
        Model.find({}, function(err, data) {
          if (err) return console.log(err);
          var array = data.filter(function(elm) {
            if (
              (open == undefined || open == elm.open.toString()) &&
              (id == undefined || id == elm._id.toString()) &&
              (title == undefined || title == elm.title.toString()) &&
              (text == undefined || text == elm.text.toString()) &&
              (createdBy == undefined ||
                createdBy == elm.createdBy.toString()) &&
              (assignedTo == undefined ||
                assignedTo == elm.assignedTo.toString()) &&
              (status == undefined || status == elm.status.toString()) &&
              (createdOn == undefined ||
                createdOn == elm.createdOn.toString()) &&
              (updatedOn == undefined || updatedOn == elm.updatedOn.toString())
            )
              return elm;
          });
          res.json(array);
        });
      };
      listIssues(
        req.params.project,
        req.query._id,
        req.query.issue_title,
        req.query.issue_text,
        req.query.created_by,
        req.query.assigned_to,
        req.query.status_text,
        req.query.created_on,
        req.query.updated_on,
        req.query.open
      );
    });
};
