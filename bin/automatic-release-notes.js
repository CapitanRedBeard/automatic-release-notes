#!/usr/bin/env node
'use strict';

var GitHubApi = require('github');
var parseSlug = require('parse-github-url');
var fs = require('fs')

var pkg = JSON.parse(fs.readFileSync('./package.json'))
var exec = require('child_process').exec;
var GH_TOKEN = process.env.GH_TOKEN
var ghRepo = parseSlug(pkg.repository.url)

var defaultRelease = {
  owner: ghRepo.owner,
  repo: ghRepo.name,
  name: pkg.version,
  tag_name: pkg.version
}

var github = new GitHubApi({
    protocol: "https",
    host: ghRepo.hostname === "github.com" ? "api.github.com" : ghRepo.hostname,
    pathPrefix: "/api/v3",
    followRedirects: false,
    timeout: 5000
});

generateReleaseNotes(defaultRelease, github);

function throwError(message) {
  console.error(message);
  process.exit(-42);
}

function createRelease(release) {
  github.repos.createRelease(defaultRelease, function (error) {
    if (error) throwError('Failed executing createRelease() ' + error);
  });
}

function printDeltaCommits(tag) {
  return 'git log --pretty=oneline --first-parent ' + tag + '..HEAD';
}

function generateReleaseNotes() {
  if(!GH_TOKEN) throwError("No GH_TOKEN env variable set. You can set it via 'export GH_TOKEN=<github token>'");
  github.authenticate({
    type: 'token',
    token: GH_TOKEN
  });

  github.repos.getLatestRelease(defaultRelease).then(function (resp) {
    exec(printDeltaCommits(resp.data.tag_name), function (error, stdout, stderr) {
          if (error !== null) throwError('Failed executing printDeltaCommits() ' + error);
          defaultRelease.body = stdout === "" ? throwError("No available commits found for this version") : stdout;
          createRelease(defaultRelease);
          console.log("Release notes successfully written, find them here: " +
            "https://" + ghRepo.hostname + "/" + ghRepo.repo + "/releases/tag/" + pkg.version)
       });
  }).catch(function (error) {
    throwError('Failed executing github.repos.getLatestRelease() ' + error);
  });
}
