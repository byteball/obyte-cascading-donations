// Test Case 1 Distribute base without rules
// 1. Alice sets up project with empty rules
// 2. Bob donates to Alice's project in base asset
// 3. Alice(the owner of the repo) calls pool distribution
// 4. Bob donates to Alice's project in base asset
// 5. Bob(not the owner of the repo) calls pool distribution
// 6. Alice claims unclaimed pool

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC, BOUNCE_FEE, DONATION_STORAGE_FEE } = require('./constants')
const { calculateCommission } = require('./utils')

describe('Obyte Cascading Donations Bot Test Case 1 Distribute base without rules', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.agent({ attestation_aa: path.join(__dirname, '../node_modules/github-attestation/github.aa') })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 100e9 })
			.with.wallet({ bob: 100e9 })
			.run()

		this.expenses = {
			alice: 0,
			bob: 0
		}
	})

	it('1.0.1 Publish alice attestation profile', async () => {
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

	it('1.1.1 Alice sets up project with empty rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				set_rules: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Rules for alice/myproject are set')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*rules']).to.be.deep.equal({})
	}).timeout(60000)

	it('1.2.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(1e9)
		expect(response.response_unit).to.be.null

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(1e9)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(1e9)
	}).timeout(60000)

	it('1.3.1 Alice triggers distribution', async () => {
		const balanceBeforeDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceBeforeDistribute.base.pending).to.be.equal(0)

		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(1e9)

		const { response } = await this.network.getAaResponseToUnit(unit)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/myproject in asset base done')
		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(1e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(0)
		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(1e9)
		expect(vars['alice/myproject*unclaimed*base']).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(101e9 - this.expenses.alice)
	}).timeout(60000)

	it('1.4.1 Bob donates to Alice in base asset', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 10e9 + DONATION_STORAGE_FEE,
			data: {
				donate: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + DONATION_STORAGE_FEE

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Successful donation to alice/myproject')
		expect(response.response.responseVars.donated_in_base).to.be.equal(10e9)

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(10e9)
		expect(vars['alice/myproject*total_received*base']).to.be.equal(11e9)
	}).timeout(60000)

	it('1.5.1 Bob triggers distribution', async () => {
		const balanceBeforeDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceBeforeDistribute.base.pending).to.be.equal(0)

		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.bob += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(0)

		const { response } = await this.network.getAaResponseToUnit(unit)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/myproject in asset base done')
		expect(response.response.responseVars.asset).to.be.equal('base')
		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(0)
		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(1e9)
		expect(vars['alice/myproject*unclaimed*base']).to.be.equal(10e9)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(101e9 - this.expenses.alice)

		const bobBalance = await this.network.wallet.bob.getBalance()
		expect(bobBalance.base.pending).to.be.equal(0)
		expect(bobBalance.base.stable).to.be.equal(89e9 - this.expenses.bob)
	}).timeout(60000)

	it('1.6.1 Alice claims unclaimed pool', async () => {
		const balanceBeforeDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceBeforeDistribute.base.pending).to.be.equal(0)

		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: BOUNCE_FEE,
			data: {
				distribute: 1,
				repo: 'alice/myproject'
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)
		this.expenses.alice += await calculateCommission(this.network, unit) + BOUNCE_FEE

		const balanceAfterDistribute = await this.network.wallet.alice.getBalance()
		expect(balanceAfterDistribute.base.pending).to.be.equal(10e9)

		const { response } = await this.network.getAaResponseToUnit(unit)
		const aliceAddress = await this.network.wallet.alice.getAddress()

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/myproject in asset base done')
		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(10e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/myproject*pool*base']).to.be.equal(0)
		expect(vars[`paid_to*${aliceAddress}*base`]).to.be.equal(11e9)
		expect(vars['alice/myproject*unclaimed*base']).to.be.equal(0)

		await this.network.witnessUntilStable(response.response_unit)

		const balanceAfterResponseStable = await this.network.wallet.alice.getBalance()
		expect(balanceAfterResponseStable.base.pending).to.be.equal(0)
		expect(balanceAfterResponseStable.base.stable).to.be.equal(111e9 - this.expenses.alice)

		const bobBalance = await this.network.wallet.bob.getBalance()
		expect(bobBalance.base.pending).to.be.equal(0)
		expect(bobBalance.base.stable).to.be.equal(89e9 - this.expenses.bob)
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
