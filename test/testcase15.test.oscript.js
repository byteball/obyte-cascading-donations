// Test Case 15 Circular cascade(custom asset)
// 0. Publish alice, bob, eva attestation profile
// 1. Set up alice, bob, eva rules
// 2. Charlie donates to aliceproject
// 3. Trigger aliceproject distribution
// 4. Trigger bobproject distribution
// 5. Trigger evaproject distribution
// 6. Check alice, bob, eva balances
// 7. Check projects' state vars
// 8. Trigger aliceproject distribution
// 9. Trigger bobproject distribution
// 10. Trigger evaproject distribution
// 11. Check alice, bob, eva balances
// 12. Check projects' state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 15 Circular cascade(custom asset)', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.asset({ myasset: {} })
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 1e6 })
			.with.wallet({ eva: 1e6 })
			.with.wallet({ charlie: { base: 1e6, myasset: 100e9 } })
			.run()
	})

	it('15.0.1 Publish alice attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
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
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('15.0.2 Publish bob attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.bob.getAddress(),
						profile: {
							github_username: 'bob'
						}
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('15.0.3 Publish eva attestation profile', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.eva.getAddress(),
						profile: {
							github_username: 'eva'
						}
					}
				}
			]
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
	}).timeout(60000)

	it('15.1.1 Alice sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'alice',
				project: 'aliceproject',
				rules: {
					'bob/bobproject': 50
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/aliceproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_owner']).to.be.equal(await this.network.wallet.alice.getAddress())
		expect(vars['alice/aliceproject_rules']).to.be.deep.equal({
			'bob/bobproject': 50
		})
	}).timeout(60000)

	it('15.1.2 Bob sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'bob',
				project: 'bobproject',
				rules: {
					'eva/evaproject': 50
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for bob/bobproject are set')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['bob/bobproject_owner']).to.be.equal(await this.network.wallet.bob.getAddress())
		expect(vars['bob/bobproject_rules']).to.be.deep.equal({
			'eva/evaproject': 50
		})
	}).timeout(60000)

	it('15.1.3 Eva sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'eva',
				project: 'evaproject',
				rules: {
					'alice/aliceproject': 50
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for eva/evaproject are set')

		const { vars } = await this.network.wallet.eva.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['eva/evaproject_owner']).to.be.equal(await this.network.wallet.eva.getAddress())
		expect(vars['eva/evaproject_rules']).to.be.deep.equal({
			'alice/aliceproject': 50
		})
	}).timeout(60000)

	it('15.2.1 Charlie donates to aliceproject', async () => {
		const { unit, error } = await this.network.wallet.charlie.sendMulti({
			base_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 1e4
				}
			],
			asset_outputs: [
				{
					address: this.network.agent.cascadingDonations,
					amount: 100e9
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

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars[`donated_in_${this.network.asset.myasset}`]).to.be.equal(100e9)
	}).timeout(60000)

	it('15.3.1 Trigger aliceproject distribution', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)
	}).timeout(60000)

	it('15.4.1 Trigger bobproject distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'bob/bobproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo bob/bobproject in asset ${this.network.asset.myasset} done`)
	}).timeout(60000)

	it('15.5.1 Trigger evaproject distribution', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'eva/evaproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo eva/evaproject in asset ${this.network.asset.myasset} done`)
	}).timeout(60000)

	it('15.6.1 Check Alice balances', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(50e9)
	}).timeout(60000)

	it('15.6.2 Check Bob balances', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(25e9)
	}).timeout(60000)

	it('15.6.3 Check Eva balances', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(12.5e9)
	}).timeout(60000)

	it('15.7.1 Check projects\' state vars', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars['alice/aliceproject_owner']).to.be.equal(aliceAddress)
		expect(vars[`alice/aliceproject_pool_${this.network.asset.myasset}`]).to.be.equal(12.5e9)

		expect(vars['bob/bobproject_owner']).to.be.equal(bobAddress)
		expect(vars[`bob/bobproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)

		expect(vars['eva/evaproject_owner']).to.be.equal(evaAddress)
		expect(vars[`eva/evaproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)

		expect(vars[`alice/aliceproject_to_bob/bobproject_${this.network.asset.myasset}`]).to.be.equal(50e9)
		expect(vars[`bob/bobproject_to_eva/evaproject_${this.network.asset.myasset}`]).to.be.equal(25e9)
		expect(vars[`eva/evaproject_to_alice/aliceproject_${this.network.asset.myasset}`]).to.be.equal(12.5e9)

		expect(vars[`alice/aliceproject_total_received_${this.network.asset.myasset}`]).to.be.equal(112.5e9)
		expect(vars[`bob/bobproject_total_received_${this.network.asset.myasset}`]).to.be.equal(50e9)
		expect(vars[`eva/evaproject_total_received_${this.network.asset.myasset}`]).to.be.equal(25e9)

		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(50e9)
		expect(vars[`paid_to_${bobAddress}_${this.network.asset.myasset}`]).to.be.equal(25e9)
		expect(vars[`paid_to_${evaAddress}_${this.network.asset.myasset}`]).to.be.equal(12.5e9)
	}).timeout(60000)

	it('15.8.1 Trigger aliceproject distribution 2', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo alice/aliceproject in asset ${this.network.asset.myasset} done`)
	}).timeout(60000)

	it('15.9.1 Trigger bobproject distribution 2', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'bob/bobproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo bob/bobproject in asset ${this.network.asset.myasset} done`)
	}).timeout(60000)

	it('15.10.1 Trigger evaproject distribution 2', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'eva/evaproject',
				asset: this.network.asset.myasset
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal(`Distribution for repo eva/evaproject in asset ${this.network.asset.myasset} done`)
	}).timeout(60000)

	it('15.11.1 Check Alice balances 2', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(56.25e9)
	}).timeout(60000)

	it('15.11.2 Check Bob balances 2', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(28.125e9)
	}).timeout(60000)

	it('15.11.3 Check Eva balances 2', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance[this.network.asset.myasset].pending).to.be.equal(0)
		expect(balance[this.network.asset.myasset].stable).to.be.equal(14.0625e9)
	}).timeout(60000)

	it('15.12.1 Check projects\' state vars 2', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars['alice/aliceproject_owner']).to.be.equal(aliceAddress)
		expect(vars[`alice/aliceproject_pool_${this.network.asset.myasset}`]).to.be.equal(1.5625e9)

		expect(vars['bob/bobproject_owner']).to.be.equal(bobAddress)
		expect(vars[`bob/bobproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)

		expect(vars['eva/evaproject_owner']).to.be.equal(evaAddress)
		expect(vars[`eva/evaproject_pool_${this.network.asset.myasset}`]).to.be.equal(0)

		expect(vars[`alice/aliceproject_to_bob/bobproject_${this.network.asset.myasset}`]).to.be.equal(56.25e9)
		expect(vars[`bob/bobproject_to_eva/evaproject_${this.network.asset.myasset}`]).to.be.equal(28.125e9)
		expect(vars[`eva/evaproject_to_alice/aliceproject_${this.network.asset.myasset}`]).to.be.equal(14.0625e9)

		expect(vars[`alice/aliceproject_total_received_${this.network.asset.myasset}`]).to.be.equal(114.0625e9)
		expect(vars[`bob/bobproject_total_received_${this.network.asset.myasset}`]).to.be.equal(56.25e9)
		expect(vars[`eva/evaproject_total_received_${this.network.asset.myasset}`]).to.be.equal(28.125e9)

		expect(vars[`paid_to_${aliceAddress}_${this.network.asset.myasset}`]).to.be.equal(56.25e9)
		expect(vars[`paid_to_${bobAddress}_${this.network.asset.myasset}`]).to.be.equal(28.125e9)
		expect(vars[`paid_to_${evaAddress}_${this.network.asset.myasset}`]).to.be.equal(14.0625e9)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
