import fs from 'fs/promises';
import path from 'path';

import t from 'libtap';
import {IntegrationInstanceBase} from '@cfware/integration-instance-base';

class CounterInstance {
	counts = {
		build: 0,
		start: [],
		stop: 0,
		checkStopped: 0
	};

	async build() {
		this.counts.build++;
	}

	async start(...args) {
		this.counts.start.push(args);
	}

	async stop() {
		this.counts.stop++;
	}

	async checkStopped() {
		this.counts.checkStopped++;
	}
}

t.type(IntegrationInstanceBase, 'function');

t.test('counters', async t => {
	const statuses = [];
	await fs.mkdir('instances', {recursive: true});

	const counter1 = new CounterInstance();
	const counter2 = new CounterInstance();
	const integration = new IntegrationInstanceBase(path.resolve('instances'), {counter1, counter2});
	integration.on('status', status => statuses.push(status));
	t.same(integration.instances, ['counter1', 'counter2']);
	t.equal(integration.defaultInstance, counter1);
	t.equal(integration.counter1, counter1);
	t.equal(integration.counter2, counter2);
	t.equal(integration.startedMessage, 'Started daemons');
	// eslint-disable-next-line promise/prefer-await-to-then
	integration.stopped.then(() => {
		statuses.push('resolved stopped');
	});

	const counts = {
		...integration.counter1.counts,
		start: []
	};
	const checkCounts = () => {
		t.same(integration.counter1.counts, counts);
		t.same(integration.counter2.counts, counts);
	};

	checkCounts();

	await integration.build();
	counts.build++;
	checkCounts();
	t.same(statuses, ['Building daemons']);
	statuses.length = 0;

	await integration.start('arg1', 'arg2');
	counts.build++;
	counts.start.push(['arg1', 'arg2']);
	checkCounts();
	t.same(statuses, [
		'Building daemons',
		'Starting daemons',
		integration.startedMessage
	]);
	statuses.length = 0;

	await integration.stop();
	counts.stop++;
	checkCounts();
	t.same(statuses, [
		'Stopping daemons',
		'Stopped daemons',
		'resolved stopped'
	]);
	statuses.length = 0;

	await integration.checkStopped();
	counts.checkStopped++;
	checkCounts();
	t.same(statuses, []);
});
