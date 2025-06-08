// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FreelancePlatform {
    struct Task {
        address creator;
        string title;
        string description;
        uint256 bounty;
        address worker;
        bool isCompleted;
        bool isActive;
    }

    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;

    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 bounty);
    event TaskAccepted(uint256 indexed taskId, address indexed worker);
    event TaskCompleted(uint256 indexed taskId, address indexed worker);

    function createTask(string memory _title, string memory _description) external payable {
        require(msg.value > 0, "Bounty must be greater than 0");
        
        uint256 taskId = taskCount++;
        tasks[taskId] = Task({
            creator: msg.sender,
            title: _title,
            description: _description,
            bounty: msg.value,
            worker: address(0),
            isCompleted: false,
            isActive: true
        });

        emit TaskCreated(taskId, msg.sender, msg.value);
    }

    function acceptTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(task.isActive, "Task is not active");
        require(task.worker == address(0), "Task already has a worker");
        require(msg.sender != task.creator, "Creator cannot accept their own task");

        task.worker = msg.sender;
        emit TaskAccepted(_taskId, msg.sender);
    }

    function completeTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(task.isActive, "Task is not active");
        require(msg.sender == task.worker, "Only the assigned worker can complete the task");
        require(!task.isCompleted, "Task is already completed");

        task.isCompleted = true;
        task.isActive = false;
        
        // Transfer bounty to worker
        (bool success, ) = task.worker.call{value: task.bounty}("");
        require(success, "Transfer failed");

        emit TaskCompleted(_taskId, msg.sender);
    }

    function getTask(uint256 _taskId) external view returns (
        address creator,
        string memory title,
        string memory description,
        uint256 bounty,
        address worker,
        bool isCompleted,
        bool isActive
    ) {
        Task memory task = tasks[_taskId];
        return (
            task.creator,
            task.title,
            task.description,
            task.bounty,
            task.worker,
            task.isCompleted,
            task.isActive
        );
    }
} 