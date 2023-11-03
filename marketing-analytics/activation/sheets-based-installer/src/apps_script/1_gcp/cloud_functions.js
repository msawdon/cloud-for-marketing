// Copyright 2019 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** @fileoverview Cloud Functions API handler class.*/

class CloudFunctions extends ApiBase {

  constructor(projectId, locationId) {
    super();
    this.apiUrl = 'https://cloudfunctions.googleapis.com';
    this.version = 'v1';
    this.projectId = projectId;
    this.locationId = locationId;
  }

  /** @override */
  getBaseUrl() {
    return `${this.apiUrl}/${this.version}`;
  }

  /**
   * Lists information about the supported locations for this service.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations/list
   * @return {!Array<!Location>} An array of resources that represents Google
   *   Cloud Platform location.
   * @see https://cloud.google.com/functions/docs/reference/rest/Shared.Types/ListLocationsResponse#Location
   */
  listLocations() {
    const { locations } = super.get(`projects/${this.projectId}/locations`);
    return locations;
  }

  /**
   * Returns a function with the given name from the requested project.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/get
   * @param {string} functionName
   * @return {!CloudFunction} See:
   *     https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions#CloudFunction
   */
  getFunction(functionName) {
    return super.get(
      `projects/${this.projectId}/locations/${this.locationId}/functions/${functionName}`);
  }

  /**
   * Returns whether a function with the given name exists.
   * @param {string} functionName
   * @return {boolean}
   */
  exist(functionName) {
    const response = this.getFunction(functionName);
    if (response.name) return true;
    if (response.error.code === 404) return false;
    console.error(`Unknown status of Cloud Functions ${functionName}`, response);
    throw new Error(`Unknown status of Cloud Functions ${functionName}`);
  }

  /**
   * Returns a list of functions that belong to the requested project and
   * location.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/list
   * @param {string=} locationId
   * @return {{functions:!Array<!CloudFunction>}}
   */
  listFunctions(locationId = this.locationId) {
    return super.get(`projects/${this.projectId}/locations/${locationId}/functions`);
  }

  /**
   * Returns a list of functions that belong to the requested project and
   * all locations.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/list
   * @param {string=} locationId
   * @return {{functions:!Array<!CloudFunction>}}
   */
  listFunctionsForAllLocations() {
    return this.listFunctions('-');
  }

  /**
   * Creates a new function.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/create
   * @param {!CloudFunction} payload
   * @return {!Operation}
   * @see https://cloud.google.com/functions/docs/reference/rest/Shared.Types/ListOperationsResponse#Operation
   */
  createFunction(payload) {
    return this.mutate(
      `projects/${this.projectId}/locations/${this.locationId}/functions`,
      payload
    );
  }

  /**
   * Updates existing function.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/patch
   * @param {string} functionsName
   * @param {!CloudFunction} payload
   * @return {!Operation}
   */
  updateFunction(functionsName, payload) {
    return this.mutate(
      `projects/${this.projectId}/locations/${this.locationId}/functions/${functionsName}`,
      payload,
      'PATCH'
    );
  }

  /**
   * Creates or updates the function.
   * @param {string} functionsName
   * @param {!CloudFunction} payload
   * @return {string} The name of operation.
   */
  createOrUpdate(functionsName, payload) {
    let operation;
    if (this.exist(functionsName)) {
      operation = this.updateFunction(functionsName, payload);
    } else {
      payload.name =
        `projects/${this.projectId}/locations/${this.locationId}/functions/${functionsName}`;
      operation = this.createFunction(payload);
    }
    return operation.name;
  }

  /**
   * Returns a signed URL for uploading a function source code.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/generateUploadUrl
   * @return {{uploadUrl: string}}
   */
  generateUploadUrl() {
    return this.mutate(
      `projects/${this.projectId}/locations/${this.locationId}/functions:generateUploadUrl`);
  }

  /**
   * Gets the result of an operation.
   * @see https://cloud.google.com/functions/docs/reference/rest/v1/operations/get
   * @param {string} operationName
   * @return {!Operation}
   */
  getOperation(operationName) {
    return super.get(operationName);
  }

}
