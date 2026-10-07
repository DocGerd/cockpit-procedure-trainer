import readme from '../README.md?raw';
import { describeDeviceReadme } from '../../../tools/readme-contract';
import { transponderDevice } from './logic';

describeDeviceReadme(readme, transponderDevice);
