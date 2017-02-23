'use strict';

var should = require('chai').should();
var range = require('lodash/range');
var sample = require('lodash/sample');

var denormalize = require('../src').denormalize;

var immutable = require('immutable');
var fromJS = immutable.fromJS;
var Map = immutable.Map;
var Record = immutable.Record;
var List = immutable.List;

var normalizr = require('normalizr');
var normalize = normalizr.normalize;
var Schema = normalizr.Schema;
var arrayOf = normalizr.arrayOf;

var normalizrImmutable = require('normalizr-immutable');
var immutableNormalize = normalizrImmutable.normalize;
var ImmutableSchema = normalizrImmutable.Schema;
var immutableArrayOf = normalizrImmutable.arrayOf;

describe('denormalizr', function () {

  var baseSchema = {
    article: new Schema('articles'),
    author: new Schema('authors'),
    comment: new Schema('comments')
  };
  baseSchema.article.define({
    author: baseSchema.author
  });
  baseSchema.comment.define({
    author: baseSchema.author
  });
  baseSchema.article.define({
    comments: arrayOf(baseSchema.comment)
  });

  it('fails denormalizing without an object schema', function () {
    (function () {
      denormalize(undefined, new Map(), null);
    }).should.throw();
  });

  it('fails denormalizing with an invalid schema', function () {
    (function () {
      denormalize(undefined, new Map(), { });
    }).should.throw();
  });

  it('fails denormalizing without entities', function () {
    (function () {
      denormalize(undefined, undefined, { });
    }).should.throw();
  });

  it('fails denormalizing with non immutable entities', function () {
    (function () {
      denormalize(undefined, { }, { });
    }).should.throw();
  });

  it('can denormalize a single entity', function () {

    var articles = generateArticles();
    Object.freeze(articles);
    var normalized = normalize(articles, arrayOf(baseSchema.article));
    var entities = fromJS(normalized.entities);

    var article = entities.get('articles').get('0');
    var denormalized = denormalize(article, entities, baseSchema.article);

    denormalized.toJS().should.eql(articles[0]);
  });

  it('can denormalize an array', function () {

    var articles = generateArticles();
    Object.freeze(articles);
    var normalized = normalize(articles, arrayOf(baseSchema.article));
    var entities = fromJS(normalized.entities);

    var denormalized = denormalize(entities.get('articles'), entities, arrayOf(baseSchema.article));

    denormalized.toList().toJS().should.eql(articles);
  });

  /* normalizr-immutable tests */

  /* Immutable Records - required parameter for normalizr-immutable's Schema */
  var Article = new Record({
    id: null,
    title: null,
    author: null,
    comments: null
  });
  var Author = new Record({
    id: null,
    name: null
  });
  var Comment = new Record({
    id: null,
    message: null,
    author: null
  });

  /* normalizr-immutable base schema */
  var immutableBaseSchema = {
    article: new ImmutableSchema('articles', Article),
    author: new ImmutableSchema('authors', Author),
    comment: new ImmutableSchema('comments', Comment)
  };
  immutableBaseSchema.article.define({
    author: immutableBaseSchema.author,
    comments: immutableArrayOf(immutableBaseSchema.comment)
  });
  immutableBaseSchema.comment.define({
    author: immutableBaseSchema.author
  });
  
  it('can denormalize a normalizr-immutable entity record', function () {

    var articles = generateArticles();
    Object.freeze(articles);
    var normalized = immutableNormalize(articles, immutableArrayOf(immutableBaseSchema.article));
    var entities = normalized.entities;

    var article = entities.get('articles').get('0');
    var denormalized = denormalize(article, entities, immutableBaseSchema.article);

    denormalized.toJS().should.eql(articles[0]);
  });

  it('can denormalize an array of normalizr-immutable entity records', function () {

    var articles = generateArticles();
    Object.freeze(articles);
    var normalized = immutableNormalize(articles, immutableArrayOf(immutableBaseSchema.article));
    var entities = normalized.entities;

    var denormalized = denormalize(entities.get('articles'), entities, immutableArrayOf(immutableBaseSchema.article));

    denormalized.toList().toJS().should.eql(articles);
  });

  it('can denormalize an array of normalizr-immutable entities with { useMapsForEntityObjects: true }', function () {

    var articles = generateArticles();
    Object.freeze(articles);
    var normalized = immutableNormalize(articles, immutableArrayOf(immutableBaseSchema.article), { useMapsForEntityObjects: true });
    var entities = normalized.entities;

    var denormalized = denormalize(entities.get('articles'), entities, immutableArrayOf(immutableBaseSchema.article));

    denormalized.toList().toJS().should.eql(articles);
  });

});


function generateArticles() {
  return range(3).map(function (articleId) {
    return {
      id: articleId,
      title: `Article ${articleId}`,
      author: {
        id: articleId,
        name: `Author ${articleId}`
      },
      comments: range(3).map(function (commentId) {
        commentId += (articleId * 3);
        const authorId = sample([0, 1, 2]);
        return {
          id: commentId,
          message: `Comment ${commentId}`,
          author: {
            id: authorId,
            name: `Author ${authorId}`
          }
        }
      })
    };
  });
}