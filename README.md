# Obyte Cascading Donations Bot

Allow github repos to receive donations and forward them (or part thereof) down to other repos they depend upon and want to support.

## Methods

### Set rules

Set donation distribution rules on repo

```javascript
trigger.data.set_rules - set this to 1
trigger.data.owner - attested github user for trigger.address
trigger.data.project - name of the project
trigger.data.rules - object with distribution rules. Omit this param to receive 100% of donations

{
	'owner1/repo1' : 10,
	'owner2/repo2' : 20,
	...
}

Maximum number of nested repos is 10. Reminder of undistributed funds will be send to the owner.
```

### Donate

Send donation to repository. Donation can be in any asset.

```javascript
trigger.data.donate - set this to 1
trigger.data.repo - repository to send donation to. Example: `owner/repo`
```

### Distribute

Distribute undistributed pool of a repository.

```javascript
trigger.data.distribute - set this to 1
trigger.data.repo - repository to trigger pool distribution on
trigger.data.asset - specifies asset to distribute. Default is `base`
```

### Set nickname

Associate donator nickname with trigger.address

```javascript
trigger.data.nickname - nickname string
```

## State Vars

```javascript
var[${repo}_rules] - distribution rules of repo
var[${repo}_owner] - repos owner's address
var[${repo}_pool_${asset}] - repo's undistributed pool in asset
var[nickname_${address}] - donor ranking nickname
var[${repo}_total_received_${asset}] - total received by repo in asset
var[${repo1}_to_${repo2}_${asset}] - total forwarded from repo1 to repo2 in asset
var[paid_to_${address}_${asset}] - total paid to repo owner
```
