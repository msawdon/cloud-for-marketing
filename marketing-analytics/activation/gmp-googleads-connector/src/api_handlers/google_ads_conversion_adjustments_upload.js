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
 * @fileoverview Tentacles API handler for Google Ads Conversion Adjustments
 * uploading (Google Ads API (unofficial) Wrapper).
 */

'use strict';

const {
  api: { googleads: { GoogleAds } },
  utils: { BatchResult },
} = require('@google-cloud/nodejs-common');
const {
  GoogleAdsConversionConfig,
  GoogleAdsClickConversionUpload,
} = require('./google_ads_click_conversions_upload.js');

/**
 * Conversion adjustment upload for Google Ads.
 */
class GoogleAdsConversionAdjustment extends GoogleAdsClickConversionUpload {

  /**
   * Sends out the data as conversion adjustments to Google Ads API.
   * This function exposes a googleAds parameter for test
   * @param {GoogleAds} googleAds Injected Google Ads instance.
   * @param {string} records Data to send out as click conversions. Expected
   *     JSON string in each line.
   * @param {string} messageId Pub/sub message ID for log.
   * @param {!GoogleAdsConversionConfig} config
   * @return {!Promise<BatchResult>}
   */
  async sendDataInternal(googleAds, records, messageId, config) {
    const managedSend = this.getManagedSendFn(config);
    const { customerId, loginCustomerId, adsConfig } = config;
    const configuredUpload = googleAds.getUploadConversionAdjustmentFn(
      customerId, loginCustomerId, adsConfig);
    return managedSend(configuredUpload, records, messageId);
  };
}

/** API name in the incoming file name. */
GoogleAdsConversionAdjustment.code = 'ACA';

module.exports = { GoogleAdsConversionAdjustment };
