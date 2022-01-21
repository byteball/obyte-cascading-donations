# Obyte Cascading Donations AA

Allow github repos to receive donations and forward them (or part thereof) down to other repos they depend upon and want to support.

[kivach.org](https://kivach.org)

## Methods

### Set rules

Set the donation distribution rules on a repo

```javascript
trigger.data.set_rules - set this to 1
trigger.data.repo - repository to set rules on (owner/project). The first part of the repo (the owner) must be the attested github user for trigger.address
trigger.data.rules - object with distribution rules. Omit this param to receive 100% of donations

{
	'owner1/repo1' : 10,
	'owner2/repo2' : 20,
	...
}
```
Maximum number of nested repos is 10. The remainder of the undistributed funds will be sent to the owner.

### Set notification AA

Set the address of an AA to be notified about each new donation

```javascript
trigger.data.repo - repository to set the notification AA for. The first part of the repo (the owner) must be the attested github user for trigger.address
trigger.data.notification_aa - address of the notification AA
```
Example notification AA: https://oscript.org/s/ayduFGpeBpnB7UYu7PUGYWorBL4UMkKS

### Donate

Send a donation to a repository. The donation can be in any asset.

```javascript
trigger.data.donate - set this to 1
trigger.data.repo - repository to send donation to. Example: `owner/repo`
```

### Distribute

Distribute the undistributed pool of a repository. If `trigger.address` is the attested owner of the repo, the owner will receive his payment. Otherwise, it will be stored in the repo's unclaimed pool.

```javascript
trigger.data.distribute - set this to 1
trigger.data.repo - repository to trigger pool distribution on
trigger.data.asset - specifies asset to distribute. Default is `base`
trigger.data.to - optional address. The attested owner can specify the addres that will receive payment instead of him.
```

### Set nickname

Associate a donor's nickname with trigger.address. Previous nickname (if any) will be freed.

```javascript
trigger.data.nickname - nickname string
```

## State Vars

```javascript
var[${repo}*rules] - distribution rules of repo
var[${repo}*notification_aa] - optional notification AA of the repo to notify about the received donations
var[${repo}*pool*${asset}] - repo's undistributed pool in asset
var[${repo}*total_received*${asset}] - total received by repo in asset
var[${repo}*total_received_from_other_repos*${asset}] - total received by repo from other repos in asset
var[${repo1_or_user_address}*to*${repo2}*${asset}] - total received or forwarded from repo1_or_user_address to repo2 in asset
var[${repo2}*from*${repo1_or_user_address}*${asset}] - total received or forwarded from repo1_or_user_address to repo2 in asset
var[${repo_or_user_address}*total_donated*${asset}] - total donated by user or repo in asset
var[total_donated*${asset}] - grand total donated in asset
var[paid_to*${address}*${asset}] - total paid to repo owner
var[${repo}*unclaimed*${asset}] - unclaimed funds of attested owner
var[nickname*${address}] - donor ranking nickname
var[nickname_owner*${nickname}] - nickanme's owner address
```

## Donations

Kivach uses itself :) to accept donations and forward a portion of them to other open-source projects that made Kivach possible.

[![Kivach](https://kivach.org/api/banner?repo=byteball/obyte-cascading-donations)](https://kivach.org/repo/byteball/obyte-cascading-donations)
