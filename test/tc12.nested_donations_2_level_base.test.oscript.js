// Test Case 12 Nested donations 2 level(base asset)
// 0. Publish alice, bob, eva attestation profile
// 1. Set up alice, bob, eva rules
// 2. Charlie donates to aliceproject
// 3. Charlie donates to bobproject
// 4. Charlie donates to evaproject
// 5. Trigger aliceproject distribution
// 6. Trigger bobproject distribution
// 7. Trigger evaproject distribution
// 8. Check alice, bob, eva balances
// 9. Check projects' state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 12 Nested donations 2 level(base asset)', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 1e6 })
			.with.wallet({ eva: 1e6 })
			.with.wallet({ charlie: 100e9 + 1e6 })
			.run()
	})

	it('12.0.1 Publish alice attestation profile', async () => {
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

	it('12.0.2 Publish bob attestation profile', async () => {
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

	it('12.0.3 Publish eva attestation profile', async () => {
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

	it('12.1.1 Alice sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'bob/bobproject': 30
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
		expect(vars['alice/aliceproject_rules']).to.be.deep.equal({
			'bob/bobproject': 30
		})
	}).timeout(60000)

	it('12.1.2 Bob sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'bob/bobproject',
				rules: {
					'eva/evaproject': 40
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
		expect(vars['bob/bobproject_rules']).to.be.deep.equal({
			'eva/evaproject': 40
		})
	}).timeout(60000)

	it('12.1.3 Eva sets up project rules', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'eva/evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for eva/evaproject are set')

		const { vars } = await this.network.wallet.eva.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['eva/evaproject_rules']).to.be.deep.equal({})
	}).timeout(60000)

	it('12.2.1 Charlie donates to aliceproject', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + 1000,
			data: {
				donate: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/aliceproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)
	}).timeout(60000)

	it('12.3.1 Charlie donates to bobproject', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + 1000,
			data: {
				donate: 1,
				repo: 'bob/bobproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to bob/bobproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)
	}).timeout(60000)

	it('12.4.1 Charlie donates to evaproject', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + 1000,
			data: {
				donate: 1,
				repo: 'eva/evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to eva/evaproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)
	}).timeout(60000)

	it('12.5.1 Trigger aliceproject distribution', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(7e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('12.6.1 Trigger bobproject distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'bob/bobproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo bob/bobproject in asset base done')

		const bobAddress = await this.network.wallet.bob.getAddress()
		expect(response.response.responseVars.claimer).to.be.equal(bobAddress)
		expect(response.response.responseVars.claimed).to.be.equal(7.8e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('12.7.1 Trigger evaproject distribution', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'eva/evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo eva/evaproject in asset base done')

		const evaAddress = await this.network.wallet.eva.getAddress()
		expect(response.response.responseVars.claimer).to.be.equal(evaAddress)
		expect(response.response.responseVars.claimed).to.be.equal(15.2e9)
		expect(response.response.responseVars.asset).to.be.equal('base')
	}).timeout(60000)

	it('12.8.1 Check Alice balances', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(7e9 + 979025)
	}).timeout(60000)

	it('12.8.2 Check Bob balances', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(7.8e9 + 979033)
	}).timeout(60000)

	it('12.8.3 Check Eva balances', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(15.2e9 + 979060)
	}).timeout(60000)

	it('12.9.1 Check projects\' state vars', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['bob/bobproject_pool_base']).to.be.equal(0)
		expect(vars['eva/evaproject_pool_base']).to.be.equal(0)

		expect(vars['alice/aliceproject_to_bob/bobproject_base']).to.be.equal(3e9)
		expect(vars['bob/bobproject_to_eva/evaproject_base']).to.be.equal(5.2e9)

		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(10e9)
		expect(vars['bob/bobproject_total_received_base']).to.be.equal(13e9)
		expect(vars['eva/evaproject_total_received_base']).to.be.equal(15.2e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(7e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(7.8e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.equal(15.2e9)

		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['bob/bobproject_unclaimed_base']).to.be.equal(0)
		expect(vars['eva/evaproject_unclaimed_base']).to.be.equal(0)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
