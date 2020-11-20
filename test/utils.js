/* eslint-disable camelcase */
const { countCommissionInUnits } = require('aa-testkit').Utils

async function calculateCommission (network, unit) {
	const { unitObj } = await network.getGenesisNode().getUnitInfo({ unit })

	const { total_headers_commission } = await countCommissionInUnits(network.getGenesisNode(), unitObj.parent_units)
	return (unitObj.headers_commission + unitObj.payload_commission) - total_headers_commission
}

async function calculateAAResponseCommission (network, unit) {
	const { response } = await network.getAaResponseToUnit(unit)
	if (response.response_unit === null) return 0
	const { unitObj } = await network.getGenesisNode().getUnitInfo({ unit: response.response_unit })
	return unitObj.headers_commission + unitObj.payload_commission
}

module.exports = {
	calculateCommission,
	calculateAAResponseCommission
}
