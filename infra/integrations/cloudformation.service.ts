import { CloudFormation, type Stack } from '@aws-sdk/client-cloudformation';

export class CloudFormationService {
  constructor(private readonly cloudFormation: CloudFormation = new CloudFormation()) {}

  async getOutputsByKey(stackName: string, outputKeys: string[]): Promise<Record<string, string>> {
    const response = await this.cloudFormation.describeStacks({ StackName: stackName });
    const stack = response.Stacks?.[0];
    if (!stack) {
      throw new Error(`Stack ${stackName} not found`);
    }
    const outputs = stack.Outputs?.filter((output) => output.OutputKey && outputKeys.includes(output.OutputKey));
    return Object.fromEntries(outputs?.map((output) => [output.OutputKey, output.OutputValue]) || []);
  }

  getClient(): CloudFormation {
    return this.cloudFormation;
  }

  private async getStack(stackName: string): Promise<Stack> {
    const response = await this.cloudFormation.describeStacks({ StackName: stackName });
    const stack = response.Stacks?.[0];
    if (!stack) {
      throw new Error(`Stack ${stackName} not found`);
    }
    return stack;
  }

  private async getStackArn(stackName: string): Promise<string> {
    const stack = await this.getStack(stackName);
    if (!stack.StackId) {
      throw new Error(`Stack ${stackName} does not have a StackId`);
    }
    return stack.StackId;
  }
}
