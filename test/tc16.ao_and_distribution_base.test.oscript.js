// Test Case 16 ao and distribution(base)
// ao = attested owner

// 0. Publish alice and bob attestation profile for aliceproject
// 1. Alice sets up aliceproject rules
// 2. Charlie donates to aliceproject 1
// 3. Alice(ao) triggers distribution
// 4. Charlie donates to aliceproject 2
// 5. Bob(ao) triggers distribution
// 6. Charlie donates to aliceproject 3
// 7. Eva(not ao) triggers distribution
// 8. Eva(not ao) fails to trigger destribution(pool is empty, but unclaimed is present)
// 9. Alice(ao) claims unclaimed pool
// 10. Alice fails to trigger distribution(nothing to distribute)
// 11. Bob fails to trigger distribution(nothing to distribute)

// 12. Charlie donates to aliceproject 4
// 13. Alice(ao) triggers distribution with "to" option (to ao - Bob)
// 14. Charlie donates to aliceproject 5
// 15. Alice(ao) triggers distribution with "to" option (to not ao - Eva)

// 16. Charlie donates to aliceproject 6
// 17. Publish Fox attestation profile for aliceproject
// 18. Fox(ao) triggers distribution(new ao)

// 19. Check AA, alice, bob, eva, charlie, fox balances
// 20. Check projects' state vars

const path = require('path')
const AA_PATH = '../agent.aa'
const { ATTESTOR_MNEMONIC } = require('./constants')

describe('Obyte Cascading Donations Bot Test Case 16 ao and distribution(base)', function () {
	this.timeout(120000)

	before(async () => {
		this.network = await Network.create()
			.with.agent({ cascadingDonations: path.join(__dirname, AA_PATH) })
			.with.wallet({ attestor: 100e9 }, ATTESTOR_MNEMONIC)
			.with.wallet({ alice: 1e6 })
			.with.wallet({ bob: 1e6 })
			.with.wallet({ eva: 1e6 })
			.with.wallet({ fox: 1e6 })
			.with.wallet({ charlie: 100e9 + 1e6 })
			.run()
	})

	it('16.0.1 Publish alice attestation profile for aliceproject', async () => {
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

	it('16.0.2 Publish bob attestation profile for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.bob.getAddress(),
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

	it('16.1.1 Alice sets up aliceproject rules', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				set_rules: 1,
				repo: 'alice/aliceproject',
				rules: {
					'owner/repo20': 20,
					'owner/repo30': 30
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
			'owner/repo20': 20,
			'owner/repo30': 30
		})
	}).timeout(60000)

	it('16.2.1 Charlie donates to aliceproject 1', async () => {
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

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(10e9 + 11000)
	}).timeout(60000)

	it('16.3.1 Alice(ao) triggers distribution', async () => {
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
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(10e9)
		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(5e9)

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(5e9 + 20248)
	}).timeout(60000)

	it('16.4.1 Charlie donates to aliceproject 2', async () => {
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

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + 21248)
	}).timeout(60000)

	it('16.5.1 Bob(ao) triggers distribution', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
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
		const bobAddress = await this.network.wallet.bob.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(bobAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(20e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(5e9)

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(10e9 + 30496)
	}).timeout(60000)

	it('16.6.1 Charlie donates to aliceproject 3', async () => {
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

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + 31496)
	}).timeout(60000)

	it('16.7.1 Eva(not ao) triggers distribution', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
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
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.undefined
		expect(response.response.responseVars.claimed).to.be.undefined
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(5e9)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(30e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.undefined

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + 41496)
	}).timeout(60000)

	it('16.8.1 Eva(not ao) fails to trigger destribution(pool is empty, but unclaimed is present)', async () => {
		const { unit, error } = await this.network.wallet.eva.triggerAaWithData({
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

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nothing to distribute in repo alice/aliceproject for asset base')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		const { vars } = await this.network.wallet.bob.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(5e9)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(30e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.undefined

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + 51496)
	}).timeout(60000)

	it('16.9.1 Alice(ao) claims unclaimed pool', async () => {
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
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(aliceAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(30e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.undefined

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + 60833)
	}).timeout(60000)

	it('16.10.1 Alice fails to trigger distribution(nothing to distribute)', async () => {
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

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nothing to distribute in repo alice/aliceproject for asset base')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(30e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.undefined

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + 70833)
	}).timeout(60000)

	it('16.11.1 Bob fails to trigger distribution(nothing to distribute)', async () => {
		const { unit, error } = await this.network.wallet.bob.triggerAaWithData({
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

		expect(response.bounced).to.be.true
		expect(response.response.error).to.be.equal('Nothing to distribute in repo alice/aliceproject for asset base')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(30e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.undefined

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(15e9 + 80833)
	}).timeout(60000)

	it('16.12.1 Charlie donates to aliceproject 4', async () => {
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

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(25e9 + 81833)
	}).timeout(60000)

	it('16.13.1 Alice(ao) triggers distribution with "to" option (to ao - Bob)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				to: await this.network.wallet.bob.getAddress()
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(bobAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(40e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.undefined

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(20e9 + 90992)
	}).timeout(60000)

	it('16.14.1 Charlie donates to aliceproject 5', async () => {
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

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(30e9 + 91992)
	}).timeout(60000)

	it('16.15.1 Alice(ao) triggers distribution with "to" option (to not ao - Eva)', async () => {
		const { unit, error } = await this.network.wallet.alice.triggerAaWithData({
			toAddress: this.network.agent.cascadingDonations,
			amount: 1e4,
			data: {
				distribute: 1,
				repo: 'alice/aliceproject',
				to: await this.network.wallet.eva.getAddress()
			}
		})

		expect(unit).to.be.validUnit
		expect(error).to.be.null
		await this.network.witnessUntilStable(unit)

		const { response } = await this.network.getAaResponseToUnit(unit)

		expect(response.bounced).to.be.false
		expect(response.response.responseVars.message).to.be.equal('Distribution for repo alice/aliceproject in asset base done')

		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(evaAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(50e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.equal(5e9)

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(25e9 + 101062)
	}).timeout(60000)

	it('16.16.1 Charlie donates to aliceproject 6', async () => {
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

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(35e9 + 102062)
	}).timeout(60000)

	it('16.17.1 Publish Fox attestation profile for aliceproject', async () => {
		const { unit, error } = await this.network.wallet.attestor.sendMulti({
			messages: [
				{
					app: 'attestation',
					payload_location: 'inline',
					payload: {
						address: await this.network.wallet.fox.getAddress(),
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

	it('16.18.1 Fox(ao) triggers distribution(new ao)', async () => {
		const { unit, error } = await this.network.wallet.fox.triggerAaWithData({
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
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()
		const foxAddress = await this.network.wallet.fox.getAddress()

		expect(response.response.responseVars.claimer).to.be.equal(foxAddress)
		expect(response.response.responseVars.claimed).to.be.equal(5e9)
		expect(response.response.responseVars.asset).to.be.equal('base')

		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(60e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${foxAddress}_base`]).to.be.equal(5e9)

		const aaBalance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)
		expect(aaBalance.base.stable).to.be.equal(30e9 + 111221)
	}).timeout(60000)

	it('16.19.1 Check AA balance', async () => {
		const balance = await this.network.wallet.alice.getBalanceOf(this.network.agent.cascadingDonations)

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(30e9 + 111221)
	}).timeout(60000)

	it('16.19.2 Check alice balance', async () => {
		const balance = await this.network.wallet.alice.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(10e9 + 937167)
	}).timeout(60000)

	it('16.19.3 Check bob balance', async () => {
		const balance = await this.network.wallet.bob.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(10e9 + 979051)
	}).timeout(60000)

	it('16.19.3 Check eva balance', async () => {
		const balance = await this.network.wallet.eva.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(5e9 + 979051)
	}).timeout(60000)

	it('16.19.4 Check fox balance', async () => {
		const balance = await this.network.wallet.fox.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(5e9 + 989494)
	}).timeout(60000)

	it('16.19.5 Check alice balance', async () => {
		const balance = await this.network.wallet.charlie.getBalance()

		expect(balance.base.pending).to.be.equal(0)
		expect(balance.base.stable).to.be.equal(40e9 + 991303)
	}).timeout(60000)

	it('16.20.1 Check projects\' state vars', async () => {
		const { vars } = await this.network.wallet.alice.readAAStateVars(this.network.agent.cascadingDonations)
		const aliceAddress = await this.network.wallet.alice.getAddress()
		const bobAddress = await this.network.wallet.bob.getAddress()
		const evaAddress = await this.network.wallet.eva.getAddress()
		const foxAddress = await this.network.wallet.fox.getAddress()

		expect(vars['alice/aliceproject_pool_base']).to.be.equal(0)
		expect(vars['owner/repo20_pool_base']).to.be.equal(12e9)
		expect(vars['owner/repo30_pool_base']).to.be.equal(18e9)

		expect(vars['alice/aliceproject_to_owner/repo20_base']).to.be.equal(12e9)
		expect(vars['alice/aliceproject_to_owner/repo30_base']).to.be.equal(18e9)

		expect(vars['alice/aliceproject_total_received_base']).to.be.equal(60e9)
		expect(vars['owner/repo20_total_received_base']).to.be.equal(12e9)
		expect(vars['owner/repo30_total_received_base']).to.be.equal(18e9)

		expect(vars[`paid_to_${aliceAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${bobAddress}_base`]).to.be.equal(10e9)
		expect(vars[`paid_to_${evaAddress}_base`]).to.be.equal(5e9)
		expect(vars[`paid_to_${foxAddress}_base`]).to.be.equal(5e9)

		expect(vars['alice/aliceproject_unclaimed_base']).to.be.equal(0)
		expect(vars['bob/bobproject_unclaimed_base']).to.be.undefined
		expect(vars['eva/evaproject_unclaimed_base']).to.be.undefined
	}).timeout(60000)

	after(async () => {
		await this.network.stop()
	})
})
