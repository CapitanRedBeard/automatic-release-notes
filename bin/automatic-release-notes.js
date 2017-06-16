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

function githubAuth() {
  if(GH_TOKEN) {
    console.log("Attempting to use GHTOKEN, ", GH_TOKEN)
    github.authenticate({
      type: 'token',
      token: GH_TOKEN
    });
  }else{
    console.log("No GH_TOKEN Found, attempting gitcred parse")
    exec("cat $gitcred", function (error, stdout, stderr) {
      if(error !== null) throwError("Couldn't rely find a $gitcred or GH_TOKEN env variable" + error)
      var authCred = parseSlug(stdout).auth.split(":");
      console.log("Using basic authentication of ", authCred[0], authCred[1]);
      github.authenticate({
        type: 'basic',
        username: authCred[0],
        password: authCred[1]
      }).then(function(resp) {
        console.log('Auth succeeded? Maybe we should be in here', resp)
      }).catch(function(error) {
        console.log('auth failed', error)
      });
    });
  }
  return;
}

function generateReleaseNotes() {
  githubAuth();
  console.log("Checking ghRepo.hostname", defaultRelease)
  // github.repos.getTags(defaultRelease).catch(function (error) {
  //   console.log("UH OH, couldn't getTags: ", error)
  // });
  //
  // github.repos.getLatestRelease(defaultRelease).then(function (resp) {
  //   exec(printDeltaCommits(resp.data.tag_name), function (error, stdout, stderr) {
  //         if (error !== null) throwError('Failed executing printDeltaCommits()\nThis is most likey because there are already releasenotes! ' + error);
  //         defaultRelease.body = stdout === "" ? throwError("No available commits found for this version") : stdout;
  //         createRelease(defaultRelease);
  //         console.log("Release notes successfully written, find them here: " +
  //           "https://" + ghRepo.hostname + "/" + ghRepo.repo + "/releases/tag/" + pkg.version)
  //      });
  // }).catch(function (error) {
  //   throwError('Failed executing github.repos.getLatestRelease() ' + error);
  // });
}
