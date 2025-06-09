// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FreelancePlatform {
    struct Task {
        address payable creator;
        string title;
        string description;
        uint256 bounty;
        address worker; // 0x0 address if no worker yet
        bool isCompleted;
        bool isActive;
        string[] requiredFileTypes; // e.g., ["pdf", "jpg"]
        string submittedFileCID; // IPFS CID of the completed work
    }

    Task[] public tasks;
    uint256 public taskCount;

    event TaskCreated(uint256 indexed id, address indexed creator, string title, uint256 bounty);
    event TaskAccepted(uint256 indexed id, address indexed worker);
    event TaskCompleted(uint256 indexed id, address indexed worker, string submittedFileCID);

    constructor() {
        taskCount = 0;
    }

    function createTask(
        string memory _title,
        string memory _description,
        uint256 _bounty,
        string[] memory _requiredFileTypes
    ) public payable {
        require(msg.value == _bounty, "Bounty must be sent with task creation");
        require(_bounty > 0, "Bounty must be greater than 0");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        
        tasks.push(Task(
            payable(msg.sender),
            _title,
            _description,
            _bounty,
            address(0), // No worker assigned initially
            false,      // Not completed
            true,       // Is active
            _requiredFileTypes,
            ""          // No submitted file initially
        ));
        taskCount++;
        emit TaskCreated(taskCount - 1, msg.sender, _title, _bounty);
    }

    function acceptTask(uint256 _taskId) public {
        require(_taskId < tasks.length, "Task does not exist");
        Task storage task = tasks[_taskId];
        require(task.isActive, "Task is not active");
        require(task.worker == address(0), "Task already has a worker");
        require(msg.sender != task.creator, "Creator cannot accept their own task");

        task.worker = msg.sender;
        emit TaskAccepted(_taskId, msg.sender);
    }

    function submitTaskCompletion(uint256 _taskId, string memory _submittedFileCID) public {
        require(_taskId < tasks.length, "Task does not exist");
        Task storage task = tasks[_taskId];
        require(task.isActive, "Task is not active");
        require(task.worker == msg.sender, "Only the assigned worker can submit completion");
        require(bytes(_submittedFileCID).length > 0, "Submitted file CID cannot be empty");

        task.submittedFileCID = _submittedFileCID;
        task.isCompleted = true;
        task.isActive = false;

        // Transfer bounty to the worker
        require(task.bounty > 0, "Bounty is 0 or already paid");
        (bool sent, ) = payable(task.worker).call{value: task.bounty}("");
        require(sent, "Failed to send bounty");
        
        emit TaskCompleted(_taskId, msg.sender, _submittedFileCID);
    }

    // Function to get a single task's details
    function getTask(uint256 _taskId) public view returns (
        address creator,
        string memory title,
        string memory description,
        uint256 bounty,
        address worker,
        bool isCompleted,
        bool isActive,
        string[] memory requiredFileTypes,
        string memory submittedFileCID
    ) {
        require(_taskId < tasks.length, "Task does not exist");
        Task storage task = tasks[_taskId];
        return (
            task.creator,
            task.title,
            task.description,
            task.bounty,
            task.worker,
            task.isCompleted,
            task.isActive,
            task.requiredFileTypes,
            task.submittedFileCID
        );
    }
} 