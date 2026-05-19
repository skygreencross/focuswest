/**
 * Focus West Pitch — Apps Script backend.
 *
 * Deploy this as a Google Apps Script web app bound to the "Focus West Pitches"
 * Google Sheet. The deck calls this script with ?client={clientId} and receives
 * the pitch data as JSON, reshaped to match the structure src/data.json expects.
 *
 * Sheet layout (transposed):
 *
 *     | A                       | B               | C            | D ...
 *   1 | clientId                | aroma           | secret-spot  | ...
 *   2 | companyName             | Company A       | Secret Spot  | ...
 *   3 | industry                | Specialty Coffee| Retail       | ...
 *   ... (64 rows, one per field)
 *
 * Adding a new client = add column C with their values (column A is the row
 * keys, never changes). The first column of every row is the field name.
 * The first row contains the client identifiers.
 *
 * Deployment steps:
 *   1. Open the sheet (link in this conversation).
 *   2. Extensions → Apps Script.
 *   3. Replace the default Code.gs contents with this file.
 *   4. Save (Cmd+S). Project name: "Focus West Pitch API".
 *   5. Deploy → New deployment.
 *   6. Gear ⚙ next to "Select type" → Web app.
 *   7. Description: "v1". Execute as: Me. Who has access: Anyone.
 *   8. Deploy. Authorize when prompted.
 *   9. Copy the "Web app URL" — looks like https://script.google.com/macros/s/AKfy.../exec
 *  10. Paste the URL into src/app.js where the comment says SHEET_API_URL.
 *  11. npm run build, redeploy the deck.
 */

// ─── Configuration ────────────────────────────────────────────────────────
var SHEET_NAME = 'Pitches';  // first tab; named when CSV is imported, usually 'Sheet1' — rename to 'Pitches' or change here

// Which fields hold stringified JSON that needs parsing before returning:
var JSON_COLUMNS = [
  'snapshotStats',
  'snapshotLocations',
  'snapshotTrajectoryYears',
  'snapshotTrajectoryRevenue',
  'teamJson',
  'platformStatsJson',
  'platformDealsJson',
  'founderValuesJson',
  'buyersJson',
  'processStepsJson',
  'processFunnelJson',
  'valueDriversJson',
  'risksJson',
  'comparablesJson',
  'scenariosJson',
  'engagementTermsJson',
  'wfStatesJson',
  'roadmapJson'
];

// ─── Public endpoint ──────────────────────────────────────────────────────
function doGet(e) {
  try {
    var clientId = String((e && e.parameter && e.parameter.client) || '').toLowerCase().trim();
    if (!clientId) {
      return jsonOut({ error: 'Missing client parameter. Try ?client=aroma' });
    }

    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0]; // fallback to first tab
    if (!sheet) {
      return jsonOut({ error: 'No sheet tab found' });
    }

    var values = sheet.getDataRange().getValues();
    if (values.length < 2 || values[0].length < 2) {
      return jsonOut({ error: 'Sheet has no data — expected field names in column A and client values in column B+' });
    }

    // First row: column A is the field name "clientId" (or similar);
    //            columns B+ contain the clientId values, one per client.
    // Locate the column index where the clientId matches the request.
    var headerRow = values[0];
    var clientCol = -1;
    for (var c = 1; c < headerRow.length; c++) {
      if (String(headerRow[c]).toLowerCase().trim() === clientId) {
        clientCol = c;
        break;
      }
    }
    if (clientCol === -1) {
      var available = [];
      for (var i = 1; i < headerRow.length; i++) {
        if (headerRow[i]) available.push(String(headerRow[i]));
      }
      return jsonOut({
        error: 'Client "' + clientId + '" not found.',
        available_clients: available
      });
    }

    // Walk all rows: column A is the field name, target column is the value.
    var obj = {};
    for (var r = 0; r < values.length; r++) {
      var key = String(values[r][0]).trim();
      if (key) obj[key] = values[r][clientCol];
    }

    // Parse JSON-typed cells
    JSON_COLUMNS.forEach(function (col) {
      if (obj[col] && typeof obj[col] === 'string' && obj[col].length > 0) {
        try {
          obj[col] = JSON.parse(obj[col]);
        } catch (err) {
          // Leave as string — the deck will likely show that section as blank
        }
      }
    });

    // Reshape into the structure the deck expects (matches src/data.json shape)
    var payload = {
      _meta: { schemaVersion: '1.0', source: 'google-sheet', client: clientId },
      client: {
        company_name:    obj.companyName,
        industry:        obj.industry,
        prepared_date:   formatDate(obj.preparedDate),
        deck_type:       obj.deckType,
        pitch_password:  obj.pitchPassword
      },
      cover: {
        eyebrow:          obj.coverEyebrow,
        headline_line_1:  obj.coverHeadlineLine1,
        headline_line_2:  obj.coverHeadlineLine2,
        subhead:          obj.coverSubhead
      },
      snapshot: {
        subhead:             obj.snapshotSubhead,
        geography:           obj.snapshotGeography,
        trajectory_caption:  obj.snapshotTrajectoryCaption,
        trajectory_years:    obj.snapshotTrajectoryYears,
        trajectory_data:     obj.snapshotTrajectoryRevenue,
        stats:               obj.snapshotStats,
        locations:           obj.snapshotLocations
      },
      team:                       obj.teamJson,
      platform_stats:             obj.platformStatsJson,
      platform_deals:             obj.platformDealsJson,
      founder_values:             obj.founderValuesJson,
      founder_values_pull_quote:  obj.founderValuesPullQuote,
      buyers:                     obj.buyersJson,
      buyers_takeaway:            obj.buyersTakeaway,
      process_steps:              obj.processStepsJson,
      process_funnel:             obj.processFunnelJson,
      value_drivers:              obj.valueDriversJson,
      risks:                      obj.risksJson,
      valuation: {
        range_low_m:               toNumber(obj.valuationRangeLow),
        range_high_m:              toNumber(obj.valuationRangeHigh),
        approach:                  obj.valuationApproach,
        caveat:                    obj.valuationCaveat,
        revenue_2025_m:            toNumber(obj.revenue2025),
        revenue_yoy_pct:           toNumber(obj.revenueYoyPct),
        ebitda_2025_m:             toNumber(obj.ebitda2025),
        ebitda_margin_pct:         toNumber(obj.ebitdaMarginPct),
        ebitda_multiple_low:       toNumber(obj.ebitdaMultLow),
        ebitda_multiple_high:      toNumber(obj.ebitdaMultHigh),
        ebitda_implied_low_m:      toNumber(obj.ebitdaImpliedLow),
        ebitda_implied_high_m:     toNumber(obj.ebitdaImpliedHigh),
        revenue_multiple_low:      toNumber(obj.revenueMultLow),
        revenue_multiple_high:     toNumber(obj.revenueMultHigh),
        revenue_implied_low_m:     toNumber(obj.revenueImpliedLow),
        revenue_implied_high_m:    toNumber(obj.revenueImpliedHigh),
        normalization_note:        obj.valuationNormalizationNote,
        source:                    obj.valuationSource
      },
      comparables:  obj.comparablesJson,
      scenarios:    obj.scenariosJson,
      waterfall: {
        default_tv_m:                toNumber(obj.wfDefaultTv),
        default_ownership_pct:       toNumber(obj.wfDefaultOwnershipPct),
        default_basis_k:             toNumber(obj.wfDefaultBasisK),
        default_state:               obj.wfDefaultState,
        working_capital_peg_pct:     toNumber(obj.wfWorkingCapitalPegPct),
        debt_outstanding_m:          toNumber(obj.wfDebtOutstanding),
        closing_costs_m:             toNumber(obj.wfClosingCosts),
        federal_cap_gains_pct:       toNumber(obj.wfFedCapGainsPct),
        states:                      obj.wfStatesJson
      },
      engagement_terms:      obj.engagementTermsJson,
      engagement_closer:     obj.engagementCloser,
      success_fee_pct:       toNumber(obj.successFeePct),
      retainer_monthly_usd:  toNumber(obj.retainerMonthlyUsd),
      roadmap:               obj.roadmapJson,
      roadmap_cta:           obj.roadmapCta,
      disclaimer:            obj.disclaimer
    };

    return jsonOut(payload);
  } catch (err) {
    return jsonOut({ error: 'Server error: ' + (err && err.message || err) });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function toNumber(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? v : n;
}

function formatDate(v) {
  if (!v) return '';
  if (v instanceof Date) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
  }
  return String(v);
}

// ─── Optional: a test function you can run from the editor to debug ───────
function _test() {
  var fake = { parameter: { client: 'aroma' } };
  var response = doGet(fake);
  Logger.log(response.getContent().substring(0, 500));
}
