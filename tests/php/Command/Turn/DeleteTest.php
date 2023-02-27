<?php
/**
 * @copyright 2018, Denis Mosolov <denismosolov@gmail.com>
 *
 * @author Denis Mosolov <denismosolov@gmail.com>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Afferoq General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
namespace OCA\Talk\Tests\php\Command\Turn;

use OCA\Talk\Command\Turn\Delete;
use OCP\IConfig;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Test\TestCase;

class DeleteTest extends TestCase {

	/** @var IConfig|\PHPUnit_Framework_MockObject_MockObject */
	private $config;

	/** @var Delete|\PHPUnit_Framework_MockObject_MockObject */
	private $command;

	/** @var InputInterface|\PHPUnit_Framework_MockObject_MockObject */
	private $input;

	/** @var OutputInterface|\PHPUnit_Framework_MockObject_MockObject */
	private $output;

	public function setUp(): void {
		parent::setUp();

		$this->config = $this->createMock(IConfig::class);

		$this->command = new Delete($this->config);

		$this->input = $this->createMock(InputInterface::class);
		$this->output = $this->createMock(OutputInterface::class);
	}

	public function testDeleteIfEmpty() {
		$this->input->method('getArgument')
			->willReturnCallback(function ($arg) {
				if ($arg === 'server') {
					return 'turn.example.com';
				} elseif ($arg === 'protocols') {
					return 'udp,tcp';
				}
				throw new \Exception();
			});
		$this->config->expects($this->once())
			->method('getAppValue')
			->with('spreed', 'turn_servers')
			->willReturn('');
		$this->config->expects($this->once())
			->method('setAppValue')
			->with(
				$this->equalTo('spreed'),
				$this->equalTo('turn_servers'),
				$this->equalTo(json_encode([]))
			);
		$this->output->expects($this->once())
			->method('writeln')
			->with($this->equalTo('<info>There is nothing to delete.</info>'));

		$this->invokePrivate($this->command, 'execute', [$this->input, $this->output]);
	}

	public function testDelete() {
		$this->input->method('getArgument')
			->willReturnCallback(function ($arg) {
				if ($arg === 'server') {
					return 'turn2.example.com';
				} elseif ($arg === 'protocols') {
					return 'udp,tcp';
				}
				throw new \Exception();
			});
		$this->config->expects($this->once())
			->method('getAppValue')
			->with('spreed', 'turn_servers')
			->willReturn(json_encode([
				[
					'server' => 'turn1.example.com',
					'secret' => 'my-test-secret-1',
					'protocols' => 'udp,tcp'
				]
			]));
		$this->config->expects($this->once())
			->method('setAppValue')
			->with(
				$this->equalTo('spreed'),
				$this->equalTo('turn_servers'),
				$this->equalTo(json_encode([
					[
						'server' => 'turn1.example.com',
						'secret' => 'my-test-secret-1',
						'protocols' => 'udp,tcp'
					]
				]))
			);
		$this->output->expects($this->once())
			->method('writeln')
			->with($this->equalTo('<info>There is nothing to delete.</info>'));

		$this->invokePrivate($this->command, 'execute', [$this->input, $this->output]);
	}

	public function testNothingToDelete() {
		$this->input->method('getArgument')
			->willReturnCallback(function ($arg) {
				if ($arg === 'server') {
					return 'turn4.example.com';
				} elseif ($arg === 'protocols') {
					return 'udp,tcp';
				}
				throw new \Exception();
			});
		$this->config->expects($this->once())
			->method('getAppValue')
			->with('spreed', 'turn_servers')
			->willReturn(json_encode([
				[
					'server' => 'turn1.example.com',
					'secret' => 'my-test-secret-1',
					'protocols' => 'udp,tcp'
				],
				[
					'server' => 'turn2.example.com',
					'secret' => 'my-test-secret-2',
					'protocols' => 'udp,tcp'
				],
				[
					'server' => 'turn3.example.com',
					'secret' => 'my-test-secret-3',
					'protocols' => 'udp,tcp'
				],
			]));
		$this->config->expects($this->once())
			->method('setAppValue')
			->with(
				$this->equalTo('spreed'),
				$this->equalTo('turn_servers'),
				$this->equalTo(json_encode([
					[
						'server' => 'turn1.example.com',
						'secret' => 'my-test-secret-1',
						'protocols' => 'udp,tcp'
					],
					[
						'server' => 'turn2.example.com',
						'secret' => 'my-test-secret-2',
						'protocols' => 'udp,tcp'
					],
					[
						'server' => 'turn3.example.com',
						'secret' => 'my-test-secret-3',
						'protocols' => 'udp,tcp'
					],
				]))
			);
		$this->output->expects($this->once())
			->method('writeln')
			->with($this->equalTo('<info>There is nothing to delete.</info>'));

		$this->invokePrivate($this->command, 'execute', [$this->input, $this->output]);
	}
}
