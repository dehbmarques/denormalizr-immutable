import pickBy from 'lodash/pickBy';
import forIn from 'lodash/forIn';
import isObject from 'lodash/isObject';
import { Iterable, Map, Record } from 'immutable';
import ArraySchema from 'normalizr/lib/IterableSchema';
import EntitySchema from 'normalizr/lib/EntitySchema';
import ImmutableArraySchema from 'normalizr-immutable/lib/IterableSchema';
import RecordEntitySchema from 'normalizr-immutable/lib/RecordEntitySchema';

export function denormalize(object, entities, schema) {

  if (!Iterable.isIterable(entities)) {
    throw new Error('Denormalizr-immutable accepts an immutable object as its entities.');
  }

  if (!isObject(schema) || Array.isArray(schema)) {
    throw new Error('Denormalizr-immutable accepts an object for schema.');
  }

  if (!(schema instanceof EntitySchema || schema instanceof ArraySchema ||
        schema instanceof RecordEntitySchema || schema instanceof ImmutableArraySchema)) {
    throw new Error('Denormalizr-immutable accepts an EntitySchema, RecordEntitySchema or ArraySchema for schema.');
  }

  if (!object) {
    return object;
  }

  if (schema instanceof ArraySchema || schema instanceof ImmutableArraySchema) {
    return denormalizeArray(object, entities, schema);
  }

  return denormalizeEntity(object, entities, schema);
}

function getEntity(id, entities, schema) {

  const entity = entities.getIn([schema.getKey(), `${id}`]);
  return entity && denormalize(entity, entities, schema);
}

function denormalizeArray(object, entities, schema) {

  let denormalized = object;

  if( schema instanceof ImmutableArraySchema && denormalized instanceof Record ){
    /* Normalizr-immutable can provide Records as well as Maps here - convert before mapping over */
    denormalized = new Map(denormalized);
  }

  return denormalized.map(entity =>
    denormalize(entity, entities, schema.getItemSchema())
  );
}

function denormalizeEntity(object, entities, schema) {

  const associations = pickBy(schema, key =>
    key instanceof EntitySchema || key instanceof ArraySchema ||
    key instanceof RecordEntitySchema || key instanceof ImmutableArraySchema
  );

  let denormalized = object;

  forIn(associations, (_schema, key) => {

    const isArray = _schema instanceof ArraySchema || _schema instanceof ImmutableArraySchema;

    if (isArray) {
      denormalized = denormalized.update(key, ids =>
        ids && ids.map(id => getEntity(id, entities, _schema.getItemSchema()))
      );
    }
    else {
      denormalized = denormalized.update(key, id => getEntity(id, entities, _schema));
    }
  });

  return denormalized;
}
