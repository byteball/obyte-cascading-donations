// Test Case 7 Nested donations 1 level(base asset)
// 0. Set up attestations for alice, bob, eva
// 1. Set up rules for alice (20% to evaproject, 30% to bobproject)
// 2. Set up empty rules for bob
// 3. Charlie donates to alice
// 4. Trigger distribution for alice/aliceproject
// 5. Trigger distribution for bob/bobproject
// 6. Eva sets up empty rules for evaproject
// 7. Trigger distribution for eva/evaproject

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 7 Nested donations 1 level(base asset)', function () {
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

	it('7.0.1 Publish alice attestation profile', async () => {
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

	it('7.0.2 Publish bob attestation profile', async () => {
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

	it('7.0.3 Publish eva attestation profile', async () => {
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

	it('7.1.1 Set up rules for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'alice',
				project: 'aliceproject',
				rules: {
					'bob/bobproject': 30,
					'eva/evaproject': 20
				}
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/aliceproject are set')
	}).timeout(60000)

	it('7.2.1 Set up rules for bobproject', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'bob',
				project: 'bobproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for bob/bobproject are set')
	}).timeout(60000)

	it('7.3.1 Charlie donates to aliceproject in base asset', async () => {
		const { unit, error } = await this.network.wallet.charlie.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 100e9 + 1000,
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
		expect(response.response.responseVars.donated_in_base).to.be.equal(100e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(100e9)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(100e9)
	}).timeout(60000)

	it('7.4.1 Trigger distribution for aliceproject(base)', async () => {
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

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(50e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)

		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(50e9)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(100e9)

		expect(vars['bob/bobproject_pool_base']).to.be.equal(30e9)
		expect(vars['bob/bobproject_total_received_base']).to.be.equal(30e9)
		expect(vars['alice/aliceproject_to_bob/bobproject_base']).to.be.equal(30e9)

		expect(vars['eva/evaproject_pool_base']).to.be.equal(20e9)
		expect(vars['eva/evaproject_total_received_base']).to.be.equal(20e9)
		expect(vars['alice/aliceproject_to_eva/evaproject_base']).to.be.equal(20e9)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(50e9 + 978996)
	}).timeout(60000)

	it('7.5.1 Trigger distribution for bobproject(base)', async () => {
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

		const balanceAfterDistribute = await this.network.wallet.bob.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(30e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo bob/bobproject in asset base done')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)

		const bobAddress = await this.network.wallet.bob.getAddress()
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(50e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(30e9)

		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(100e9)

		expect(vars['bob/bobproject_pool_base']).to.be.equal(0)
		expect(vars['bob/bobproject_total_received_base']).to.be.equal(30e9)
		expect(vars['alice/aliceproject_to_bob/bobproject_base']).to.be.equal(30e9)

		expect(vars['eva/evaproject_pool_base']).to.be.equal(20e9)
		expect(vars['eva/evaproject_total_received_base']).to.be.equal(20e9)
		expect(vars['alice/aliceproject_to_eva/evaproject_base']).to.be.equal(20e9)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.bob.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(30e9 + 979053)
	}).timeout(60000)

	it('7.6.1 Set up rules for evaproject', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'eva',
				project: 'evaproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)
		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for eva/evaproject are set')
	}).timeout(60000)

	it('7.7.1 Trigger distribution for evaproject(base)', async () => {
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

		const balanceAfterDistribute = await this.network.wallet.eva.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(20e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo eva/evaproject in asset base done')

		const { vars } = await this.network.wallet.eva.readAAStateVars(this.network.agent.cascadingDonations)

		const bobAddress = await this.network.wallet.bob.getAddress()
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(50e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(30e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.equal(20e9)

		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(100e9)

		expect(vars['bob/bobproject_pool_base']).to.be.equal(0)
		expect(vars['bob/bobproject_total_received_base']).to.be.equal(30e9)
		expect(vars['alice/aliceproject_to_bob/bobproject_base']).to.be.equal(30e9)

		expect(vars['eva/evaproject_pool_base']).to.be.equal(0)
		expect(vars['eva/evaproject_total_received_base']).to.be.equal(20e9)
		expect(vars['alice/aliceproject_to_eva/evaproject_base']).to.be.equal(20e9)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.eva.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(20e9 + 979053)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
