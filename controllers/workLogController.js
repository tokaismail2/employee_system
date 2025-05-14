const EmployeeWorkLog = require('../models/employeeWorkLog');

//get req
exports.getAllLogs = async (req, res) => {
    try {
        const logs = await EmployeeWorkLog.find().sort({ employeeName: 1, createdAt: -1 });

        // نجمع التقارير حسب اسم الموظف
        const groupedLogs = logs.reduce((acc, log) => {
            if (!acc[log.employeeName]) {
                acc[log.employeeName] = [];
            }
            acc[log.employeeName].push(log);
            return acc;
        }, {});

        res.json(groupedLogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


//اخر شهر
exports.getLogsOfLastMonth = async (req, res) => {
    try {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        lastMonth.setHours(0, 0, 0, 0);
        today.setHours(23, 59, 59, 999);

        const logs = await EmployeeWorkLog.find({
            createdAt: { $gte: lastMonth, $lte: today }
        }).lean();

        // ترتيب البيانات حسب كل موظف وتحته سجلاته
        const groupedLogs = logs.reduce((acc, log) => {
            const { employeeName, services, totalPrice, createdAt } = log;

            if (!acc[employeeName]) {
                acc[employeeName] = [];
            }

            acc[employeeName].push({ services, totalPrice, createdAt });
            return acc;
        }, {});

        const result = Object.keys(groupedLogs).map(name => ({
            employeeName: name,
            logs: groupedLogs[name]
        }));

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getLogsByDate = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'من فضلك ادخل تاريخ البداية والنهاية' });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // نجيب البيانات
        const logs = await EmployeeWorkLog.find({
            createdAt: { $gte: start, $lte: end }
        }).lean();

        // نرتبهم كل موظف وتحته سجلاته
        const groupedLogs = logs.reduce((acc, log) => {
            const { employeeName, services, totalPrice, createdAt } = log;

            if (!acc[employeeName]) {
                acc[employeeName] = [];
            }

            acc[employeeName].push({ services, totalPrice, createdAt });
            return acc;
        }, {});

        // نحولهم لمصفوفة عشان تظهر بشكل مرتب في الـ JSON
        const result = Object.keys(groupedLogs).map(name => ({
            employeeName: name,
            logs: groupedLogs[name]
        }));

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


//post req

exports.createLog = async (req, res) => {
    try {
        const { employeeName, services, customFaceCleanPrice } = req.body;

        // Validation أولي للمدخلات
        if (!employeeName || !Array.isArray(services) || services.length === 0) {
            return res.status(400).json({ message: 'برجاء إدخال اسم الموظف والخدمات المطلوبة.' });
        }

        const servicePrices = {
            'قص شعر وتصفيف': 130,
            'حلاقة شعر': 70,
            'دقن': 60,
            'قص أطفال (ولاد)': 50,
            'قص أطفال (بنات)': 80,
            'استشوار شعر': 60,
            'مكوى بيبي ليس': 60,
            'توبيك تكثيف': 20,
            'صبغة شعر أسود': 110,
            'رش ألوان': 15,
            'شمع أو فتلة': 20,
            'تنظيف بشرة': 20, // السعر الافتراضي
        };

        // تعديل السعر لو فيه customFaceCleanPrice
        if (services.includes('تنظيف بشرة') && customFaceCleanPrice) {
            servicePrices['تنظيف بشرة'] = customFaceCleanPrice;
        }

        // حساب الإجمالي
        const totalPrice = services.reduce((sum, service) => {
            const price = servicePrices[service];
            if (!price) {
                console.warn(`تنبيه: الخدمة "${service}" غير معرفة في قائمة الأسعار.`);
            }
            return sum + (price || 0);
        }, 0);

        const newLog = new EmployeeWorkLog({
            employeeName,
            services,
            totalPrice
        });

        const savedLog = await newLog.save();
        res.status(201).json(savedLog);

    } catch (error) {
        console.error('حدث خطأ أثناء إنشاء السجل:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر. برجاء المحاولة لاحقًا.' });
    }
};




exports.deleteLogsByDate = async (req, res) => {
    try {
        const { date } = req.query;

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const result = await EmployeeWorkLog.deleteMany({
            createdAt: { $gte: start, $lte: end }
        });

        res.status(200).json({ message: 'Logs deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




