// Test Case 18 distribution bounces
// ao = attested owner

// 0. Publish alice attestation profile for aliceproject
// 1. Alice sets up aliceproject rules
// 	rules: {}

// 2. (empty pool; not ao; empty unclaimed) Bob triggers distribution - bounce
// 3. (empty pool;     ao; empty unclaimed) Alice triggers distribution - bounce

// 4. Charlie donates 10e9 to alice/aliceproject in myasset 1
// 5. (      pool; not ao; empty unclaimed) Bob triggers distribution - success
// 6. (empty pool; not ao;       unclaimed) Bob triggers distribution - bounce
// 7. (empty pool;     ao;       unclaimed) Alice triggers distribution - success

// 8. Charlie donates 10e9 to alice/aliceproject in myasset 2
// 9. (      pool;     ao; empty unclaimed) Alice triggers distribution - success

// 10. Charlie donates 10e9 to alice/aliceproject in myasset 3
// 11. Bob triggers distribution
// 12. Charlie donates 10e9 to alice/aliceproject in myasset 4
// 13. (      pool;     ao;       unclaimed) Alice triggers distribution - success

// 14. Charlie donates 10e9 to alice/aliceproject in myasset 5
// 15. Bob triggers distribution
// 16. Charlie donates 10e9 to alice/aliceproject in myasset 6
// 17. (      pool; not ao;       unclaimed) Bob triggers distribution - success

// 18. Check AA, alice, bob
// 19. Check projects' state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE, DEFAULT_EXPENDABLE } = require('./constants')
const { calculateCommission, calculateAAResponseCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 18 distribution bounces', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.agent({ attestation_aa: path.join(__dirname, '../node_modules/github-attestation/github.aa') })
			.with.asset({ myasset: {} })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: DEFAULT_EXPENDABLE })
			.with.wallet({ bob: DEFAULT_EXPENDABLE })
			.with.wallet({ charlie: { base: DEFAULT_EXPENDABLE, myasset: 100e9 } })
			.run()

		this.aaOwnBalance = 0
		this.expenses = {
			aa: 0,
			alice: 0,
			bob: 0,
			charlie: 0
		}
	})

	it('18.0.1 Publish alice attestation profile for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			outputs_by_asset: {
				base: [{address: this.network.agent.attestation_aa, amount: BOUNCE_FEE}]
			},
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.alice.getAddress(),
						profile: {
							github_username: 'alice'
						}
					}
				},
				{
					app: 'data',
					payload: {
						address: await this.network.wallet.alice.getAddress(),
						github_username: 'alice',
					}
				},
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('18.1.1 Alice sets up aliceproject rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/aliceproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject*rules']).to.be.deep.equal({})
		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
	}).timeout(60000)

	it('18.2.1 (empty pool; not ao; empty unclaimed) Bob triggers distribution - bounce', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal(`Nothing to distribute in repo alice/aliceproject for asset ${this.network.asset.myasset}`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.alice.getAddress()

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
	}).timeout(60000)

	it('18.3.1 (empty pool;     ao; empty unclaimed) Alice triggers distribution - bounce', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal(`Nothing to distribute in repo alice/aliceproject for asset ${this.network.asset.myasset}`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.alice.getAddress()

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
	}).timeout(60000)

	it('18.4.1 Charlie donates 10e9 to alice/aliceproject in myasset 1', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: BOUNCE_FEE
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 10e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/aliceproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(10e9)

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
	}).timeout(60000)

	it('18.5.1 (      pool; not ao; empty unclaimed) Bob triggers distribution - success', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)
	}).timeout(60000)

	it('18.6.1 (empty pool; not ao;       unclaimed) Bob triggers distribution - bounce', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal(`Nothing to distribute in repo alice/aliceproject for asset ${this.network.asset.myasset}`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.alice.getAddress()

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.undefined
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)
	}).timeout(60000)

	it('18.7.1 (empty pool;     ao;       unclaimed) Alice triggers distribution - success', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(10e9)
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(0)
	}).timeout(60000)

	it('18.8.1 Charlie donates 10e9 to alice/aliceproject in myasset 2', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: BOUNCE_FEE
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 10e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/aliceproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)
	}).timeout(60000)

	it('18.9.1 (      pool;     ao; empty unclaimed) Alice triggers distribution - success', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(10e9)
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(20e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(20e9)
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(0)
	}).timeout(60000)

	it('18.10.1 Charlie donates 10e9 to alice/aliceproject in myasset 3', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: BOUNCE_FEE
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 10e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/aliceproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)
	}).timeout(60000)

	it('18.11.1 Bob triggers distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(30e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(20e9)
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)
	}).timeout(60000)

	it('18.12.1 Charlie donates 10e9 to alice/aliceproject in myasset 4', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: BOUNCE_FEE
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 10e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/aliceproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(20e9)
	}).timeout(60000)

	it('18.13.1 (      pool;     ao;       unclaimed) Alice triggers distribution - success', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(20e9)
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(40e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(40e9)
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(0)
	}).timeout(60000)

	it('18.14.1 Charlie donates 10e9 to alice/aliceproject in myasset 5', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: BOUNCE_FEE
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 10e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/aliceproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)
	}).timeout(60000)

	it('18.15.1 Bob triggers distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(10e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(50e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(40e9)
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(10e9)
	}).timeout(60000)

	it('18.16.1 Charlie donates 10e9 to alice/aliceproject in myasset 6', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: BOUNCE_FEE
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 10e9
				}
			],
			asset: this.network.asset.myasset,
			messages: [
				{
					app: 'data',
					payload_location: 'inline',
					payload: {
						donate: 1,
						repo: 'alice/aliceproject'
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.charlie += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(10e9)

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(20e9)
	}).timeout(60000)

	it('18.17.1 (      pool; not ao;       unclaimed) Bob triggers distribution - success', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE
		this.aaOwnBalance += BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined
		expect(response.response.responseVars.asset).to.be.equal(this.network.asset.myasset)

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(20e9)
		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(60e9)
		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(40e9)
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		this.expenses.aa += await calculateAAResponseCommission(this.network, unit)
		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance[this.network.asset.myasset].stable).to.be.equal(20e9)
	}).timeout(60000)

	it('18.18.1 Check alice balance', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(40e9)
		expect(balance.base.stable).to.be.equal(DEFAULT_EXPENDABLE - this.expenses.alice)
	}).timeout(60000)

	it('18.18.2 Check bob balance', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance[this.network.asset.myasset]).to.be.undefined
		expect(balance.base.stable).to.be.equal(DEFAULT_EXPENDABLE - this.expenses.bob)
	}).timeout(60000)

	it('18.18.3 Check charlie balance', async () => {
		const balance = await this.network.wallet.charlie.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(40e9)
		expect(balance.base.stable).to.be.equal(DEFAULT_EXPENDABLE - this.expenses.charlie)
	}).timeout(60000)

	it('18.18.4 Check AA balance', async () => {
		const balance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(20e9)
		expect(balance.base.stable).to.be.equal(this.aaOwnBalance - this.expenses.aa)
	}).timeout(60000)

	it('18.19.1 Check projects\' state vars', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(vars[`alice/aliceproject*pool*${this.network.asset.myasset}`]).to.be.equal(0)
		expect(vars[`alice/aliceproject*total_received*${this.network.asset.myasset}`]).to.be.equal(60e9)

		expect(vars[`paid_to*${aliceAddress}*${this.network.asset.myasset}`]).to.be.equal(40e9)
		expect(vars[`paid_to*${bobAddress}*${this.network.asset.myasset}`]).to.be.undefined

		expect(vars[`alice/aliceproject*unclaimed*${this.network.asset.myasset}`]).to.be.equal(20e9)
		expect(vars[`bob/bobproject*unclaimed*${this.network.asset.myasset}`]).to.be.undefined
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
