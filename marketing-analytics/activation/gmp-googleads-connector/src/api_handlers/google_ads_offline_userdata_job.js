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

/**
 * @fileoverview Tentacles API handler for Google Ads OfflineUserDataJob
 *     uploading for Customer Match or Store Sales Direct.
 */

'use strict';

const {
  api: { googleads: { GoogleAds, OfflineUserDataJobConfig } },
  utils: { getProperValue, BatchResult },
  storage: { StorageFile },
} = require('@google-cloud/nodejs-common');
const { GoogleAdsCustomerMatch } = require('./google_ads_customer_match_upload.js');

/**
 * @see https://developers.google.com/google-ads/api/docs/remarketing/audience-types/customer-match?hl=en#customer_match_considerations
 * The operations collection for each AddOfflineUserDataJobOperationsRequest can
 * contain at most 100,000.
 * @const {number}
 */
const RECORDS_PER_REQUEST = 100000;

/** @const {number} Can't add user data to the same job simultaneously. */
const NUMBER_OF_THREADS = 1;

/**
 * Queries per second. Google Ads has no limits on queries per second, however
 * it has limits on the gRPC size (4MB), so large requests may fail.
 * This can be overwritten by configuration.
 */
const QUERIES_PER_SECOND = 1;

/**
 * Configuration for a Google Ads offline user data job upload.
 * @typedef {{
*   developerToken:string,
*   offlineUserDataJobConfig: !OfflineUserDataJobConfig,
*   recordsPerRequest:(number|undefined),
*   qps:(number|undefined),
*   secretName:(string|undefined),
* }}
*/
let GoogleAdsOfflineUserDataJobConfig;

/**
 * Offline user data job for Google Ads.
 */
class GoogleAdsOfflineUserDataJobUpload extends GoogleAdsCustomerMatch {

  /** @override */
  getSpeedOptions(config) {
    const recordsPerRequest =
      getProperValue(config.recordsPerRequest, RECORDS_PER_REQUEST);
    const numberOfThreads = NUMBER_OF_THREADS;
    const qps = getProperValue(config.qps, QUERIES_PER_SECOND, false);
    return { recordsPerRequest, numberOfThreads, qps };
  }

  /**
   * Sends out the data as user ids to Google Ads API.
   * This function exposes a googleAds parameter for test
   * @param {GoogleAds} googleAds Injected Google Ads instance.
   * @param {string} message Message data from Pubsub. It could be the
   *     information of the file to be sent out, or a piece of data that need to
   *     be send out (used for test).
   * @param {string} messageId Pub/sub message ID for log.
   * @param {!GoogleAdsOfflineUserDataJobConfig} config
   * @return {!Promise<BatchResult>}
   */
  async sendDataInternal(googleAds, message, messageId, config) {
    let records;
    try {
      const { bucket, file } = JSON.parse(message);
      if (file) {
        const storageFile = new StorageFile(bucket, file);
        records = await storageFile.loadContent(0);
      } else {
        this.logger.error('Could find GCS infomation in message', message);
        return {
          result: false,
          errors: [`Could find GCS infomation in message: ${message}`],
        };
      }
    } catch (error) {
      this.logger.error('Incoming message: ', message);
      records = message;
    }
    try {
      const { offlineUserDataJobConfig } = config;
      if (offlineUserDataJobConfig.type.startsWith('CUSTOMER_MATCH')) {
        offlineUserDataJobConfig.list_id =
          await this.getOrCreateUserList(googleAds, offlineUserDataJobConfig);
      }
      const jobResourceName =
        await googleAds.createOfflineUserDataJob(offlineUserDataJobConfig);
      this.logger.info('jobResourceName: ', jobResourceName);
      const managedSend = this.getManagedSendFn(config);
      const configedUpload = googleAds.getAddOperationsToOfflineUserDataJobFn(
        config.offlineUserDataJobConfig, jobResourceName);
      const result = await managedSend(configedUpload, records, messageId);
      this.logger.info('add userdata result: ', result);
      await googleAds.runOfflineUserDataJob(
        offlineUserDataJobConfig, jobResourceName);
      return result;
    } catch (error) {
      this.logger.error('Error in UserdataOfflineDataService: ', error);
      return this.getResultFromError(googleAds, error);
    }
  }

}

/** API name in the incoming file name. */
GoogleAdsOfflineUserDataJobUpload.code = 'AOUD';

/** Data for this API will be transferred through GCS by default. */
GoogleAdsOfflineUserDataJobUpload.defaultOnGcs = true;

module.exports = {
  GoogleAdsOfflineUserDataJobConfig,
  GoogleAdsOfflineUserDataJobUpload,
};
