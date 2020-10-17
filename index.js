import fs from 'fs/promises';
import EventEmitter from 'events';

import pMap from 'p-map';

export class IntegrationInstanceBase extends EventEmitter {
	#resolveStopped;
	#instancesPath;
	#instances = {};

	get instances() {
		return Object.keys(this.#instances);
	}

	get defaultInstance() {
		return this[this.instances[0]];
	}

	get startedMessage() {
		return 'Started daemons';
	}

	stopped = new Promise(resolve => {
		this.#resolveStopped = resolve;
	});

	constructor(instancesPath, instances) {
		super();

		this.#instancesPath = instancesPath;
		Object.assign(this.#instances, instances);
		Object.assign(this, instances);
	}

	async build() {
		await fs.rmdir(this.#instancesPath, {recursive: true});
		this.emit('status', 'Building daemons');
		await pMap(
			Object.values(this.#instances),
			instance => instance.build()
		);
	}

	async start(...args) {
		await this.build();

		this.emit('status', 'Starting daemons');
		await pMap(
			Object.values(this.#instances),
			instance => instance.start(...args)
		);
		this.emit('status', this.startedMessage);
	}

	async stop() {
		this.emit('status', 'Stopping daemons');
		await pMap(
			Object.values(this.#instances),
			instance => instance.stop()
		);
		this.emit('status', 'Stopped daemons');

		this.#resolveStopped();
	}

	async checkStopped() {
		await pMap(
			Object.values(this.#instances),
			instance => instance.checkStopped?.()
		);
	}
}
