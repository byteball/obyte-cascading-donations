// Test Case 1 Distribute base without rules
// 1. Alice sets up project with empty rules
// 2. Bob donates to Alice's project in base asset
// 3. Alice(the owner of the repo) calls pool distribution
// 4. Bob donates to Alice's project in base asset
// 5. Bob(not the owner of the repo) calls pool distribution

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 1 Distribute base without rules', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 100e9 })
			.with.wallet({ bob: 100e9 })
			.run()
	})

	it('1.0.1 Publish alice attestation profile', async () => {
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

	it('1.1.1 Alice sets up project with empty rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				owner: 'alice',
				project: 'myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/myproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_owner']).to.be.equal(await this.network.wallet.alice.getAddress())
		expect(vars['alice/myproject_rules']).to.be.deep.equal({})
	}).timeout(60000)

	it('1.2.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e9 + 1000,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(1e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_pool_base']).to.be.equal(1e9)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(1e9)
	}).timeout(60000)

	it('1.3.1 Alice triggers distribution', async () => {
		const balanceBeforeDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceBeforeDistribute.base.pending).to.be.equal(0)

		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(1e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/myproject in asset base done')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_pool_base']).to.be.equal(0)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(1e9)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(100999979051)
	}).timeout(60000)

	it('1.4.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + 1000,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_pool_base']).to.be.equal(10e9)
		expect(vars['alice/myproject_total_received_base']).to.be.equal(11e9)
	}).timeout(60000)

	it('1.5.1 Bob triggers distribution', async () => {
		const balanceBeforeDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceBeforeDistribute.base.pending).to.be.equal(0)

		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(10e9)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/myproject in asset base done')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject_pool_base']).to.be.equal(0)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(11e9)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(110999979051)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
